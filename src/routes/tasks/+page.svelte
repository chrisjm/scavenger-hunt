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
	let groupList = $state<any[]>([]);
	let joinGroupId = $state<string | null>(null); // used for admin active-group selection
	let joinGroupName = $state(''); // used for non-admin text-based group join
	let createName = $state('');
	let createDescription = $state('');
	let onboardingError = $state<string | null>(null);
	let joining = $state(false);
	let creating = $state(false);

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
		// group-scoped data will load when activeGroupId is present
		loadGroupList();
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

	async function loadGroupList() {
		try {
			const response = await fetch('/api/groups');
			if (response.ok) {
				groupList = await response.json();
			}
		} catch (error) {
			console.error('Failed to load groups:', error);
		}
	}

	async function joinGroup() {
		if (!userId) {
			onboardingError = 'You must be signed in to join a group.';
			return;
		}

		// Non-admins: join via text input and /check-group
		if (!isAdmin) {
			const trimmedName = joinGroupName.trim();
			if (!trimmedName) {
				onboardingError = 'Enter your group name.';
				return;
			}

			onboardingError = null;
			joining = true;
			try {
				// Validate that group exists
				const checkRes = await fetch(`/api/check-group/${encodeURIComponent(trimmedName)}`);
				const checkData = await checkRes.json().catch(() => ({}));
				if (!checkRes.ok || checkData.exists === false) {
					onboardingError =
						checkData.error ||
						`No group found with the name "${trimmedName}". Please check with your organizer.`;
					return;
				}

				const groupId = checkData.id as string | undefined;
				if (!groupId) {
					onboardingError = 'Unable to resolve group. Please try again.';
					return;
				}

				// Join the validated group
				const response = await fetch(`/api/groups/${groupId}/join`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ userId })
				});
				if (!response.ok) {
					const error = await response.json().catch(() => ({}));
					onboardingError = error.error || 'Failed to join group';
					return;
				}
				await userContext.refreshGroups();
				userContext.setActiveGroup(groupId);
				joinGroupName = '';
			} catch (error) {
				console.error('Failed to join group:', error);
				onboardingError = 'Failed to join group';
			} finally {
				joining = false;
			}
			return;
		}

		// Admins: select any existing group as active (no join required)
		if (!joinGroupId) {
			onboardingError = 'Select a group to use as your active group.';
			return;
		}
		onboardingError = null;
		userContext.setActiveGroup(joinGroupId);
	}

	async function createGroup() {
		if (!userId || !createName.trim()) {
			onboardingError = 'Enter a group name.';
			return;
		}
		onboardingError = null;
		creating = true;
		try {
			const response = await fetch('/api/groups', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					userId,
					name: createName.trim(),
					description: createDescription.trim() || undefined
				})
			});
			if (!response.ok) {
				const error = await response.json().catch(() => ({}));
				onboardingError = error.error || 'Failed to create group';
				return;
			}
			const data = await response.json();
			await userContext.refreshGroups();
			userContext.setActiveGroup(data.group.id);
			createName = '';
			createDescription = '';
		} catch (error) {
			console.error('Failed to create group:', error);
			onboardingError = 'Failed to create group';
		} finally {
			creating = false;
		}
	}
</script>

<div
	class="min-h-screen bg-gradient-to-br from-green-50 via-white to-red-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950"
>
	{#if !activeGroupId}
		<div class="container mx-auto max-w-3xl p-4 md:p-6">
			<div
				class="rounded-2xl border border-blue-100 bg-gradient-to-br from-white to-blue-50 p-6 shadow-sm dark:border-slate-700 dark:from-slate-900 dark:to-slate-900"
			>
				<h2 class="text-2xl font-bold text-gray-800 mb-4 dark:text-slate-100">
					Join a group to get started
				</h2>
				<p class="text-gray-600 mb-4 dark:text-slate-300">
					The scavenger hunt is group-based. Join an existing group or create one if you’re an
					admin.
				</p>

				<div class="space-y-4">
					{#if !isAdmin}
						<div>
							<label
								for="group-name"
								class="block text-sm font-semibold text-gray-700 mb-2 dark:text-slate-200"
							>
								Enter your group name
							</label>
							<input
								id="group-name"
								type="text"
								class="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
								placeholder="Exact name of your group"
								bind:value={joinGroupName}
							/>
							<button
								class="mt-3 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white text-sm font-semibold shadow-sm hover:bg-blue-700 disabled:opacity-60"
								onclick={joinGroup}
								disabled={joining}
							>
								{joining ? 'Joining…' : 'Join Group'}
							</button>
						</div>
					{:else}
						<div>
							<label
								for="group-select"
								class="block text-sm font-semibold text-gray-700 mb-2 dark:text-slate-200"
							>
								Select active group
							</label>
							<select
								id="group-select"
								class="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
								bind:value={joinGroupId}
							>
								<option value="">-- Choose a group --</option>
								{#each groupList as group}
									<option value={group.id}>{group.name}</option>
								{/each}
							</select>
							<button
								class="mt-3 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white text-sm font-semibold shadow-sm hover:bg-blue-700 disabled:opacity-60"
								onclick={joinGroup}
								disabled={joining}
							>
								Use this group
							</button>
						</div>
						<div class="border-t border-gray-200 pt-4 mt-4 dark:border-slate-700">
							<h3 class="text-lg font-semibold text-gray-800 mb-2 dark:text-slate-100">
								Create a new group
							</h3>
							<div class="space-y-2">
								<input
									class="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
									placeholder="Group name"
									bind:value={createName}
								/>
								<textarea
									class="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
									placeholder="Description (optional)"
									rows="2"
									bind:value={createDescription}
								></textarea>
								<button
									class="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white text-sm font-semibold shadow-sm hover:bg-green-700 disabled:opacity-60"
									onclick={createGroup}
									disabled={creating}
								>
									{creating ? 'Creating…' : 'Create Group'}
								</button>
							</div>
						</div>
					{/if}

					{#if onboardingError}
						<div
							class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-700 dark:bg-red-950/40 dark:text-red-300"
						>
							{onboardingError}
						</div>
					{/if}
				</div>
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
