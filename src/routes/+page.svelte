<script lang="ts">
	import { io } from 'socket.io-client';
	import type { Socket } from 'socket.io-client';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import StatsGrid from '$lib/components/StatsGrid.svelte';
	import TaskGrid from '$lib/components/TaskGrid.svelte';
	import TabbedView from '$lib/components/TabbedView.svelte';
	import SidebarMenu from '$lib/components/SidebarMenu.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import { TreePine } from 'lucide-svelte';

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

	// Sidebar state
	let sidebarOpen = $state(false);

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

		if (!storedUserId) {
			goto('/login');
			return;
		}

		userId = storedUserId;

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

		socket.on('submission-deleted', (data: any) => {
			// Remove submission from the feed
			submissions = submissions.filter((sub) => sub.id !== data.submissionId);

			// Refresh leaderboard since scores may have changed
			loadLeaderboard();

			// If it was the current user's submission, refresh their submissions
			if (data.userId === userId) {
				loadSubmissions();
			}
		});
	}
</script>

<div class="container mx-auto max-w-4xl p-4 md:p-6">
	<!-- Hamburger Menu -->
	{#if userName}
		<SidebarMenu onClick={() => (sidebarOpen = true)} />
	{/if}

	<div class="relative mb-6 text-center md:mb-8">
		<h1
			class="mb-3 text-3xl font-bold text-gray-800 md:mb-4 md:text-5xl flex items-center justify-center gap-3"
		>
			<TreePine class="text-green-600" size={40} />
			<span
				class="bg-gradient-to-r from-red-600 via-green-600 to-red-600 bg-clip-text text-transparent"
			>
				Scavenger Hunt
			</span>
			<TreePine class="text-green-600" size={40} />
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
		<TaskGrid {tasks} {loading} {userId} {completedTaskIds} {userSubmissions} />
	</div>

	<TabbedView {submissions} {leaderboard} {leaderboardLoading} />
</div>

<!-- Sidebar -->
{#if userName}
	<Sidebar isOpen={sidebarOpen} onClose={() => (sidebarOpen = false)} {userName} />
{/if}
