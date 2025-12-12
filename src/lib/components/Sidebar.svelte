<script lang="ts">
	import { User, Camera, LogOut, X, ListChecks, Activity, Settings } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { getUserContext } from '$lib/stores/user';
	import GroupSelector from '$lib/components/GroupSelector.svelte';

	const userContext = getUserContext();
	const isAdmin = $derived(userContext.isAdmin);
	const userId = $derived(userContext.userId);
	const activeGroupId = $derived(userContext.activeGroupId);

	interface Props {
		isOpen: boolean;
		onClose: () => void;
		userName: string | null;
	}

	let { isOpen, onClose, userName }: Props = $props();
	let progressLoading = $state(false);
	let completionRate = $state(0);

	interface TaskSummary {
		unlocked: boolean;
	}

	interface SubmissionSummary {
		userId: string;
		valid: boolean;
		taskId: number;
	}

	type SidebarRoute = '/tasks' | '/submissions' | '/profile' | '/library' | '/groups/select';

	async function handleLogout() {
		try {
			await fetch('/api/auth/logout', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' }
			});
		} catch (error) {
			console.error('Logout failed', error);
		}
		userContext.userId = null;
		userContext.userName = null;
		userContext.setActiveGroup(null);
		onClose();
		goto(resolve('/'));
	}

	function handleNavigation(path: SidebarRoute) {
		goto(resolve(path));
		onClose();
	}

	async function loadProgress() {
		if (!userId || !activeGroupId) return;
		progressLoading = true;
		try {
			const tasksResponse = await fetch('/api/tasks');
			const tasks = (await tasksResponse.json()) as TaskSummary[];
			const unlockedTasks = tasks.filter((task) => task.unlocked);

			const submissionsResponse = await fetch(`/api/submissions?groupId=${activeGroupId}`);
			const submissions = (await submissionsResponse.json()) as SubmissionSummary[];
			const userSubmissions = submissions.filter(
				(submission) => submission.userId === userId && submission.valid
			);
			const completedTaskIds = new Set(userSubmissions.map((submission) => submission.taskId));
			completionRate =
				unlockedTasks.length > 0
					? Math.round((completedTaskIds.size / unlockedTasks.length) * 100)
					: 0;
		} catch (error) {
			console.error('Failed to load progress for sidebar:', error);
		} finally {
			progressLoading = false;
		}
	}

	// Recompute progress when user/group changes or when the drawer opens
	$effect(() => {
		if (userId && activeGroupId) {
			loadProgress();
		}
	});

	$effect(() => {
		if (isOpen && userId && activeGroupId) {
			loadProgress();
		}
	});
</script>

<!-- Backdrop -->
{#if isOpen}
	<button
		class="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity cursor-default dark:bg-black/70"
		onclick={onClose}
		onkeydown={(e) => {
			if (e.key === 'Escape') {
				onClose();
			}
		}}
		aria-label="Close sidebar"
		type="button"
	></button>
{/if}

<!-- Sidebar -->
<div
	class="fixed top-0 right-0 h-full w-80 bg-white shadow-xl transform transition-transform duration-300 ease-in-out z-50 dark:bg-slate-900 {isOpen
		? 'translate-x-0'
		: 'translate-x-full'}"
>
	<div class="flex flex-col h-full">
		<!-- Header -->
		<div
			class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-800"
		>
			<h2 class="text-xl font-bold text-gray-800 dark:text-slate-100">Menu</h2>
			<button
				onclick={onClose}
				class="p-2 rounded-lg hover:bg-gray-100 transition-colors dark:hover:bg-slate-800"
			>
				<X size={20} class="text-gray-600 dark:text-slate-300" />
			</button>
		</div>

		<!-- Profile Section -->
		{#if userName}
			<div class="p-6 border-b border-gray-200 space-y-4 dark:border-slate-800">
				<div class="flex items-center gap-3">
					<div
						class="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-blue-500 text-lg font-bold text-white"
					>
						{userName.slice(0, 2).toUpperCase()}
					</div>
					<div class="flex-1">
						<h3 class="font-semibold text-gray-800 dark:text-slate-100">{userName}</h3>
						<div class="mt-1">
							<div
								class="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400"
							>
								<span>Progress</span>
								<span>{progressLoading ? '…' : `${completionRate}%`}</span>
							</div>
							<div class="mt-1 h-1.5 w-full rounded-full bg-gray-200 dark:bg-slate-700">
								<div
									class="h-1.5 rounded-full bg-blue-600 dark:bg-blue-500 transition-all duration-300"
									style={`width: ${completionRate}%`}
								></div>
							</div>
						</div>
					</div>
				</div>

				<div class="mt-2">
					<GroupSelector />
				</div>
			</div>
		{/if}

		<!-- Navigation -->
		<nav class="flex-1 p-6">
			<div class="space-y-2">
				<button
					onclick={() => handleNavigation('/tasks')}
					class="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-left text-gray-800 dark:text-slate-100"
				>
					<ListChecks size={20} class="text-gray-600 dark:text-slate-300" />
					<span class="font-medium text-gray-600 dark:text-slate-300">Tasks</span>
				</button>

				<button
					onclick={() => handleNavigation('/submissions')}
					class="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-left text-gray-800 dark:text-slate-100"
				>
					<Activity size={20} class="text-gray-600 dark:text-slate-300" />
					<span class="font-medium text-gray-600 dark:text-slate-300">Submissions</span>
				</button>

				<button
					onclick={() => handleNavigation('/profile')}
					class="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-left text-gray-800 dark:text-slate-100"
				>
					<User size={20} class="text-gray-600 dark:text-slate-300" />
					<span class="font-medium text-gray-600 dark:text-slate-300">Edit Profile</span>
				</button>

				<button
					onclick={() => handleNavigation('/library')}
					class="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-left text-gray-800 dark:text-slate-100"
				>
					<Camera size={20} class="text-gray-600 dark:text-slate-300" />
					<span class="font-medium text-gray-700 dark:text-slate-300">My Library</span>
				</button>

				{#if isAdmin}
					<button
						onclick={() => handleNavigation('/groups/select')}
						class="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-left text-gray-800 dark:text-slate-100"
					>
						<Settings size={20} class="text-gray-600 dark:text-slate-300" />
						<span class="font-medium text-gray-700 dark:text-slate-300">Manage Groups</span>
					</button>
				{/if}
			</div>
		</nav>

		<!-- Logout -->
		<div class="p-6 border-t border-gray-200">
			<button
				onclick={handleLogout}
				class="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-red-50 transition-colors text-left group dark:hover:bg-red-950/40"
			>
				<LogOut size={20} class="text-red-600 dark:text-red-200" />
				<span class="font-medium text-red-600 dark:text-red-200">Logout</span>
			</button>
		</div>
	</div>
</div>
