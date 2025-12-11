<script lang="ts">
	import { io } from 'socket.io-client';
	import type { Socket } from 'socket.io-client';
	import { onMount } from 'svelte';
	import StatsGrid from '$lib/components/StatsGrid.svelte';
	import TaskGrid from '$lib/components/TaskGrid.svelte';
	import TabbedView from '$lib/components/TabbedView.svelte';
	import { getUserContext } from '$lib/stores/user';

	// Get user context from layout
	const userContext = getUserContext();
	let userId = $derived(userContext.userId);
	let userName = $derived(userContext.userName);
	let isAdmin = $derived(userContext.isAdmin);
	let userGroups = $derived(userContext.userGroups);
	let activeGroupId = $derived(userContext.activeGroupId);

	// State
	let socket: Socket | undefined;
	let loading = $state(true);
	let tasks = $state<any[]>([]);
	let submissions = $state<any[]>([]);
	let leaderboard = $state<any[]>([]);
	let leaderboardLoading = $state(false);
	// Group selection handled on /groups/select

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

	// Load data when component mounts
	onMount(() => {
		loadTasks();
	});

	// Connect socket when userId is available
	$effect(() => {
		if (userId) {
			connectSocket();
		}
	});

	// Reload submissions/leaderboard whenever activeGroupId changes
	$effect(() => {
		if (activeGroupId) {
			loadSubmissions();
			loadLeaderboard();
		}
	});

	async function loadSubmissions() {
		if (!activeGroupId) return;
		try {
			const response = await fetch(`/api/submissions?groupId=${activeGroupId}`);
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
		if (!activeGroupId) return;
		try {
			leaderboardLoading = true;
			const response = await fetch(`/api/submissions/leaderboard?groupId=${activeGroupId}`);
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
			// Ignore submissions from other groups
			if (submission.groupId !== activeGroupId) return;

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

<div
	class="min-h-screen bg-gradient-to-br from-green-50 via-white to-red-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950"
>
	{#if !activeGroupId}
		<div class="flex min-h-[50vh] items-center justify-center">
			<div class="text-center text-gray-600 dark:text-slate-300">
				<p class="text-lg font-semibold">Choose a group to continue.</p>
				<p class="text-sm mt-2">Redirecting you to group selection…</p>
			</div>
		</div>
	{:else}
		<div class="container mx-auto max-w-4xl p-4 md:p-6">
			<div class="relative mb-6 text-center md:mb-8">
				<p class="mx-auto max-w-2xl px-4 text-lg text-gray-600 md:text-xl dark:text-slate-300">
					Find festive items, snap a photo, or choose one from your library to complete the
					challenge!
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
				<TaskGrid {tasks} {loading} {userId} {completedTaskIds} {userSubmissions} {activeGroupId} />
			</div>

			<TabbedView {submissions} {leaderboard} {leaderboardLoading} />
		</div>
	{/if}
</div>
