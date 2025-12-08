<script lang="ts">
	import { io } from 'socket.io-client';
	import type { Socket } from 'socket.io-client';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import StatsGrid from '$lib/components/StatsGrid.svelte';
	import TaskGrid from '$lib/components/TaskGrid.svelte';
	import TabbedView from '$lib/components/TabbedView.svelte';

	// State
	let socket: Socket | undefined;
	let loading = $state(true);
	let tasks = $state<any[]>([]);
	let submissions = $state<any[]>([]);
	let leaderboard = $state<any[]>([]);
	let leaderboardLoading = $state(false);

	// User authentication state
	let userId = $state<string | null>(null);
	let userName = $state<string | null>(null);

	// Derived stats
	let unlockedTasks = $derived(tasks.filter((task) => task.unlocked));
	let totalTasks = $derived(tasks.length);
	let userSubmissions = $derived(submissions.filter((sub) => sub.userId === userId));
	let approvedUserSubmissions = $derived(userSubmissions.filter((sub) => sub.valid));
	let completedTaskIds = $derived(new Set(approvedUserSubmissions.map((sub) => sub.taskId)));
	let completionRate = $derived(
		unlockedTasks.length > 0 ? Math.round((completedTaskIds.size / unlockedTasks.length) * 100) : 0
	);
	let approvedSubmissions = $derived(submissions.filter((sub) => sub.valid));

	// Check authentication and redirect if needed
	onMount(() => {
		const storedUserId = localStorage.getItem('scavenger-hunt-userId');
		const storedUserName = localStorage.getItem('scavenger-hunt-userName');

		if (!storedUserId || !storedUserName) {
			goto('/login');
			return;
		}

		userId = storedUserId;
		userName = storedUserName;

		loadTasks();
		loadSubmissions();
		loadLeaderboard();
		connectSocket();
	});

	async function loadSubmissions() {
		try {
			const response = await fetch('/api/submissions');
			if (response.ok) {
				submissions = await response.json();
			}
		} catch (error) {
			console.error('Failed to load submissions:', error);
		}
	}

	async function loadTasks() {
		try {
			const response = await fetch('/api/tasks');
			tasks = await response.json();
		} catch (error) {
			console.error('Failed to load tasks:', error);
		} finally {
			loading = false;
		}
	}

	async function loadLeaderboard() {
		try {
			leaderboardLoading = true;
			const response = await fetch('/api/submissions/leaderboard');
			if (response.ok) {
				leaderboard = await response.json();
			}
		} catch (error) {
			console.error('Failed to load leaderboard:', error);
		} finally {
			leaderboardLoading = false;
		}
	}

	function connectSocket() {
		if (!userId) return;

		socket = io();
		socket.on('connect', () => {
			console.log('Connected to server');
			socket?.emit('join-room', userId);
		});

		socket.on('new-submission', (submission: any) => {
			// Add new submission to the feed
			submissions = [submission, ...submissions];

			// If valid, refresh leaderboard to show updated scores immediately
			if (submission.valid) {
				loadLeaderboard();
			}
		});
	}
</script>

<div class="container mx-auto max-w-4xl p-4 md:p-6">
	<div class="relative mb-6 text-center md:mb-8">
		{#if userName}
			<div class="absolute right-0 top-0 flex gap-2">
				<a
					href="/library"
					class="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 text-sm shadow-md transition-all hover:shadow-lg"
					title="My Library"
				>
					<span class="text-xl">📸</span>
					<span class="hidden text-gray-700 sm:inline">Library</span>
				</a>
				<a
					href="/profile"
					class="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 text-sm shadow-md transition-all hover:shadow-lg"
					title="Edit Profile"
				>
					<div
						class="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-blue-500 text-xs font-bold text-white"
					>
						{userName.charAt(0).toUpperCase()}
					</div>
					<span class="hidden text-gray-700 sm:inline">{userName}</span>
				</a>
			</div>
		{/if}

		<h1
			class="mb-3 bg-gradient-to-r from-red-600 via-green-600 to-red-600 bg-clip-text text-3xl font-bold text-transparent md:mb-4 md:text-5xl"
		>
			🎄 Scavenger Hunt 🎄
		</h1>
		<p class="mx-auto max-w-2xl px-4 text-lg text-gray-600 md:text-xl">
			Find festive items, snap a photo, or choose one from your library to complete the challenge!
		</p>
	</div>

	<div class="mb-6 md:mb-8">
		<StatsGrid
			{loading}
			{totalTasks}
			unlockedTasks={unlockedTasks.length}
			{completionRate}
			approvedSubmissions={approvedUserSubmissions.length}
			totalSubmissions={userSubmissions.length}
		/>
	</div>

	<div class="mb-6 md:mb-8">
		<TaskGrid {tasks} {loading} {userId} />
	</div>

	<TabbedView {submissions} {leaderboard} {leaderboardLoading} />
</div>
