<script lang="ts">
	import { onMount } from 'svelte';
	import { getUserContext } from '$lib/stores/user';

	const userContext = getUserContext();
	const userId = $derived(userContext.userId);
	const isAdmin = $derived(userContext.isAdmin);
	const activeGroupId = $derived(userContext.activeGroupId);

	let groupList = $state<any[]>([]);
	let joinGroupId = $state<string | null>(null); // admin dropdown
	let joinGroupName = $state(''); // non-admin text entry
	let createName = $state('');
	let createDescription = $state('');
	let onboardingError = $state<string | null>(null);
	let joining = $state(false);
	let creating = $state(false);
	let loadingList = $state(false);

	onMount(() => {
		if (isAdmin) {
			loadGroupList();
		}
	});

	$effect(() => {
		if (isAdmin) {
			loadGroupList();
		}
	});

	async function loadGroupList() {
		loadingList = true;
		try {
			const response = await fetch('/api/groups');
			if (response.ok) {
				groupList = await response.json();
			}
		} catch (error) {
			console.error('Failed to load groups:', error);
		} finally {
			loadingList = false;
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
	class="min-h-screen bg-gradient-to-br from-amber-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950"
>
	<div class="container mx-auto max-w-3xl p-4 md:p-8">
		<div class="mb-8">
			<p class="text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-300">
				Group setup
			</p>
			<h1 class="text-3xl font-bold text-gray-900 dark:text-slate-100">Choose your group</h1>
			<p class="mt-2 text-gray-600 dark:text-slate-300">
				Join your existing group to start the scavenger hunt. Organizers can create new groups or
				switch the active group here.
			</p>
			{#if activeGroupId}
				<p class="mt-2 text-sm text-green-700 dark:text-green-300">
					Active group set. You can switch below or head back to tasks.
				</p>
			{/if}
		</div>

		<div
			class="rounded-2xl border border-blue-100 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900"
		>
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
						class="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
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
				<div class="space-y-6">
					<div>
						<div class="flex items-center justify-between mb-2">
							<label
								for="group-select"
								class="block text-sm font-semibold text-gray-700 dark:text-slate-200"
							>
								Select active group
							</label>
							{#if loadingList}
								<span class="text-xs text-gray-500 dark:text-slate-400">Loading…</span>
							{/if}
						</div>
						<select
							id="group-select"
							class="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
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
							{joining ? 'Setting…' : 'Use this group'}
						</button>
					</div>

					<div class="border-t border-gray-200 pt-4 dark:border-slate-700">
						<h3 class="text-lg font-semibold text-gray-800 mb-2 dark:text-slate-100">
							Create a new group
						</h3>
						<div class="space-y-2">
							<input
								class="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
								placeholder="Group name"
								bind:value={createName}
							/>
							<textarea
								class="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
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
				</div>
			{/if}

			{#if onboardingError}
				<div
					class="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-700 dark:bg-red-950/40 dark:text-red-300"
				>
					{onboardingError}
				</div>
			{/if}
		</div>
	</div>
</div>
