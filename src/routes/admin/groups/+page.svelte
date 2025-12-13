<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { getUserContext } from '$lib/stores/user';

	const userContext = getUserContext();
	const activeGroupId = $derived(userContext.activeGroupId);

	type AdminGroup = {
		id: string;
		name: string;
		description: string | null;
		createdAt: string;
		createdByUserId: string | null;
	};

	let loading = $state(true);
	let error = $state<string | null>(null);
	let groups = $state<AdminGroup[]>([]);

	let createName = $state('');
	let createDescription = $state('');
	let creating = $state(false);

	let editingGroupId = $state<string | null>(null);
	let editName = $state('');
	let editDescription = $state('');
	let saving = $state(false);
	let deletingId = $state<string | null>(null);

	onMount(() => {
		load();
	});

	async function load() {
		loading = true;
		error = null;
		try {
			const res = await fetch('/api/admin/groups');
			const data = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(data.error || 'Failed to load groups');
			groups = data.groups as AdminGroup[];
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load groups';
		} finally {
			loading = false;
		}
	}

	async function createGroup() {
		error = null;
		if (!createName.trim()) {
			error = 'Name is required.';
			return;
		}
		creating = true;
		try {
			const res = await fetch('/api/admin/groups', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: createName.trim(),
					description: createDescription.trim() || null
				})
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(data.error || 'Failed to create group');
			createName = '';
			createDescription = '';
			await load();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to create group';
		} finally {
			creating = false;
		}
	}

	function startEdit(group: AdminGroup) {
		editingGroupId = group.id;
		editName = group.name;
		editDescription = group.description ?? '';
	}

	function cancelEdit() {
		editingGroupId = null;
		editName = '';
		editDescription = '';
	}

	async function saveEdit() {
		if (!editingGroupId) return;
		error = null;
		saving = true;
		try {
			const res = await fetch('/api/admin/groups', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					groupId: editingGroupId,
					name: editName.trim(),
					description: editDescription.trim() || null
				})
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(data.error || 'Failed to update group');
			await load();
			cancelEdit();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to update group';
		} finally {
			saving = false;
		}
	}

	async function deleteGroup(id: string) {
		const ok = confirm('Delete this group? This may delete related data depending on constraints.');
		if (!ok) return;
		error = null;
		deletingId = id;
		try {
			const res = await fetch('/api/admin/groups', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ groupId: id })
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(data.error || 'Failed to delete group');
			await load();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to delete group';
		} finally {
			deletingId = null;
		}
	}

	function setActiveGroup(id: string) {
		userContext.setActiveGroup(id);
	}
</script>

<div
	class="min-h-screen bg-gradient-to-br from-green-50 via-white to-red-50 p-4 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950"
>
	<div class="container mx-auto max-w-5xl">
		<div
			class="mb-6 flex items-center justify-between gap-3 rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900"
		>
			<div>
				<h1 class="text-2xl font-bold text-gray-800 dark:text-slate-100">Admin: Groups</h1>
				<p class="mt-2 text-sm text-gray-600 dark:text-slate-300">
					Create, edit, delete, and set the active group.
				</p>
			</div>
			<button
				type="button"
				onclick={() => goto(resolve('/admin'))}
				class="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
			>
				Back
			</button>
		</div>

		{#if error}
			<div
				class="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
			>
				{error}
			</div>
		{/if}

		<div class="mb-6 rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
			<h2 class="text-lg font-semibold text-gray-800 dark:text-slate-100">Create Group</h2>
			<div class="mt-4 grid gap-4 md:grid-cols-2">
				<div>
					<label for="createGroupName" class="text-sm font-medium text-gray-700 dark:text-slate-200"
						>Name</label
					>
					<input
						id="createGroupName"
						class="mt-1 w-full rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
						bind:value={createName}
						placeholder="e.g. Team Holly"
					/>
				</div>
				<div>
					<label
						for="createGroupDescription"
						class="text-sm font-medium text-gray-700 dark:text-slate-200">Description</label
					>
					<input
						id="createGroupDescription"
						class="mt-1 w-full rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
						bind:value={createDescription}
						placeholder="Optional"
					/>
				</div>
				<div class="md:col-span-2">
					<button
						type="button"
						onclick={createGroup}
						disabled={creating}
						class="w-full rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition-all hover:scale-[1.01] disabled:opacity-50"
					>
						{creating ? 'Creating…' : 'Create Group'}
					</button>
				</div>
			</div>
		</div>

		<div class="rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
			<h2 class="text-lg font-semibold text-gray-800 dark:text-slate-100">Groups</h2>
			{#if loading}
				<div class="py-8 text-center text-sm text-gray-600 dark:text-slate-300">Loading…</div>
			{:else if groups.length === 0}
				<div class="py-8 text-center text-sm text-gray-600 dark:text-slate-300">
					No groups found.
				</div>
			{:else}
				<div class="mt-4 overflow-x-auto">
					<table class="w-full text-left text-sm">
						<thead class="text-xs uppercase text-gray-500 dark:text-slate-400">
							<tr>
								<th class="py-2 pr-4">Name</th>
								<th class="py-2 pr-4">Description</th>
								<th class="py-2 pr-4">Active</th>
								<th class="py-2 pr-4"></th>
							</tr>
						</thead>
						<tbody>
							{#each groups as group (group.id)}
								<tr class="border-t border-gray-100 dark:border-slate-800">
									<td class="py-3 pr-4 align-top">
										{#if editingGroupId === group.id}
											<input
												class="w-full rounded-xl border border-gray-200 bg-white p-2 text-sm text-gray-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
												bind:value={editName}
											/>
										{:else}
											<div class="font-medium text-gray-800 dark:text-slate-100">{group.name}</div>
										{/if}
									</td>
									<td class="py-3 pr-4 align-top">
										{#if editingGroupId === group.id}
											<input
												class="w-full rounded-xl border border-gray-200 bg-white p-2 text-sm text-gray-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
												bind:value={editDescription}
											/>
										{:else}
											<div class="text-gray-700 dark:text-slate-200">{group.description ?? ''}</div>
										{/if}
									</td>
									<td class="py-3 pr-4 align-top text-gray-700 dark:text-slate-200">
										{#if group.id === activeGroupId}
											<span
												class="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700 dark:bg-emerald-900/50 dark:text-emerald-200"
												>Active</span
											>
										{:else}
											<button
												type="button"
												onclick={() => setActiveGroup(group.id)}
												class="rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
											>
												Set Active
											</button>
										{/if}
									</td>
									<td class="py-3 pr-4 align-top">
										{#if editingGroupId === group.id}
											<div class="flex gap-2">
												<button
													type="button"
													onclick={saveEdit}
													disabled={saving}
													class="rounded-xl bg-green-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
												>
													{saving ? 'Saving…' : 'Save'}
												</button>
												<button
													type="button"
													onclick={cancelEdit}
													class="rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
												>
													Cancel
												</button>
											</div>
										{:else}
											<div class="flex gap-2">
												<button
													type="button"
													onclick={() => startEdit(group)}
													class="rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
												>
													Edit
												</button>
												<button
													type="button"
													onclick={() => deleteGroup(group.id)}
													disabled={deletingId === group.id}
													class="rounded-xl bg-red-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
												>
													{deletingId === group.id ? 'Deleting…' : 'Delete'}
												</button>
											</div>
										{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	</div>
</div>
