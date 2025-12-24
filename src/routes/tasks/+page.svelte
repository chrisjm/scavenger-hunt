<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import StatsGrid from '$lib/components/StatsGrid.svelte';
	import TaskGrid from '$lib/components/TaskGrid.svelte';
	import TabbedView from '$lib/components/TabbedView.svelte';
	import { getUserContext } from '$lib/stores/user';

	// Get user context from layout
	const userContext = getUserContext();
	let userId = $derived(userContext.userId);
	let activeGroupId = $derived(userContext.activeGroupId);

	interface Task {
		id: number;
		description: string;
		unlocked: boolean;
		unlockDate: string;
	}

	interface Submission {
		id: string;
		userId: string;
		taskId: number;
		valid: boolean;
		userName: string;
		taskDescription: string;
		imagePath: string;
		aiReasoning: string;
		aiConfidence: number;
		submittedAt: string;
	}

	interface LeaderboardEntry {
		name: string;
		score: number;
	}

	// State
	let loading = $state(true);
	let tasks = $state<Task[]>([]);
	let submissions = $state<Submission[]>([]);
	let leaderboard = $state<LeaderboardEntry[]>([]);
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

	// Load data when component mounts
	onMount(() => {
		loadTasks();
	});

	// Reload submissions/leaderboard whenever activeGroupId changes
	$effect(() => {
		if (!browser) return;
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
</script>

<div
	class="min-h-screen bg-gradient-to-br from-green-50 via-white to-red-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950"
>
	<div class="container mx-auto max-w-4xl p-4 md:p-6">
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
			<TaskGrid {tasks} {loading} {completedTaskIds} {userSubmissions} />
		</div>

		<TabbedView {submissions} {leaderboard} {leaderboardLoading} />
	</div>
</div>
