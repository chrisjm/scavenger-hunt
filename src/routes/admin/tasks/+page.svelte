<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	type AdminTask = {
		id: number;
		description: string;
		aiPrompt: string;
		minConfidence: number;
		unlockDate: string;
		createdAt: string;
		groups: { id: string; name: string }[];
	};

	type Group = {
		id: string;
		name: string;
	};

	let loading = $state(true);
	let error = $state<string | null>(null);
	let tasks = $state<AdminTask[]>([]);
	let availableGroups = $state<Group[]>([]);

	let createDescription = $state('');
	let createAiPrompt = $state('');
	let createMinConfidence = $state('0.7');
	let createUnlockDate = $state('');
	let createSelectedGroupIds = $state<string[]>([]);
	let creating = $state(false);

	let editingTaskId = $state<number | null>(null);
	let editDescription = $state('');
	let editAiPrompt = $state('');
	let editMinConfidence = $state('0.7');
	let editUnlockDate = $state('');
	let editSelectedGroupIds = $state<string[]>([]);
	let saving = $state(false);
	let deletingId = $state<number | null>(null);

	onMount(() => {
		loadGroups();
		load();
	});

	async function loadGroups() {
		try {
			const res = await fetch('/api/admin/groups');
			const data = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(data.error || 'Failed to load groups');
			availableGroups = data.groups as Group[];
		} catch (e) {
			console.error('Failed to load groups:', e);
		}
	}

	async function load() {
		loading = true;
		error = null;
		try {
			const res = await fetch('/api/admin/tasks');
			const data = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(data.error || 'Failed to load tasks');
			tasks = data.tasks as AdminTask[];
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load tasks';
		} finally {
			loading = false;
		}
	}

	function toDatetimeLocal(iso: string) {
		const d = new Date(iso);
		const pad = (n: number) => String(n).padStart(2, '0');
		return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
	}

	async function createTask() {
		error = null;
		if (!createDescription.trim() || !createAiPrompt.trim() || !createUnlockDate) {
			error = 'Description, AI Prompt, and Unlock Date are required.';
			return;
		}
		if (createSelectedGroupIds.length === 0) {
			error = 'At least one group must be selected.';
			return;
		}
		creating = true;
		try {
			const res = await fetch('/api/admin/tasks', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					description: createDescription.trim(),
					aiPrompt: createAiPrompt.trim(),
					minConfidence: Number(createMinConfidence),
					unlockDate: new Date(createUnlockDate).toISOString(),
					groupIds: createSelectedGroupIds
				})
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(data.error || 'Failed to create task');
			createDescription = '';
			createAiPrompt = '';
			createMinConfidence = '0.7';
			createUnlockDate = '';
			createSelectedGroupIds = [];
			await load();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to create task';
		} finally {
			creating = false;
		}
	}

	function startEdit(task: AdminTask) {
		editingTaskId = task.id;
		editDescription = task.description;
		editAiPrompt = task.aiPrompt;
		editMinConfidence = String(task.minConfidence);
		editUnlockDate = toDatetimeLocal(task.unlockDate);
		editSelectedGroupIds = task.groups.map((g) => g.id);
	}

	function cancelEdit() {
		editingTaskId = null;
		editDescription = '';
		editAiPrompt = '';
		editMinConfidence = '0.7';
		editUnlockDate = '';
		editSelectedGroupIds = [];
	}

	async function saveEdit() {
		if (editingTaskId == null) return;
		error = null;
		if (editSelectedGroupIds.length === 0) {
			error = 'At least one group must be selected.';
			return;
		}
		saving = true;
		try {
			const res = await fetch(`/api/admin/tasks/${editingTaskId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					description: editDescription.trim(),
					aiPrompt: editAiPrompt.trim(),
					minConfidence: Number(editMinConfidence),
					unlockDate: new Date(editUnlockDate).toISOString(),
					groupIds: editSelectedGroupIds
				})
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(data.error || 'Failed to update task');
			await load();
			cancelEdit();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to update task';
		} finally {
			saving = false;
		}
	}

	async function deleteTask(id: number) {
		const ok = confirm('Delete this task? This cannot be undone.');
		if (!ok) return;
		error = null;
		deletingId = id;
		try {
			const res = await fetch(`/api/admin/tasks/${id}`, { method: 'DELETE' });
			const data = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(data.error || 'Failed to delete task');
			await load();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to delete task';
		} finally {
			deletingId = null;
		}
	}

	function toggleGroupSelection(groupId: string, isCreate: boolean) {
		const selectedIds = isCreate ? createSelectedGroupIds : editSelectedGroupIds;
		const index = selectedIds.indexOf(groupId);
		if (index > -1) {
			if (isCreate) {
				createSelectedGroupIds = selectedIds.filter((id) => id !== groupId);
			} else {
				editSelectedGroupIds = selectedIds.filter((id) => id !== groupId);
			}
		} else {
			if (isCreate) {
				createSelectedGroupIds = [...selectedIds, groupId];
			} else {
				editSelectedGroupIds = [...selectedIds, groupId];
			}
		}
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
				<h1 class="text-2xl font-bold text-gray-800 dark:text-slate-100">Admin: Tasks</h1>
				<p class="mt-2 text-sm text-gray-600 dark:text-slate-300">
					Create and manage scavenger hunt tasks.
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
			<h2 class="text-lg font-semibold text-gray-800 dark:text-slate-100">Create Task</h2>
			<div class="mt-4 grid gap-4 md:grid-cols-2">
				<div>
					<label
						for="createDescription"
						class="text-sm font-medium text-gray-700 dark:text-slate-200">Description</label
					>
					<input
						class="mt-1 w-full rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
						bind:value={createDescription}
						placeholder="e.g. Find a candy cane"
						id="createDescription"
					/>
				</div>
				<div>
					<label
						for="createUnlockDate"
						class="text-sm font-medium text-gray-700 dark:text-slate-200">Unlock Date</label
					>
					<input
						type="datetime-local"
						class="mt-1 w-full rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
						bind:value={createUnlockDate}
						id="createUnlockDate"
					/>
				</div>
				<div class="md:col-span-2">
					<label for="createAiPrompt" class="text-sm font-medium text-gray-700 dark:text-slate-200"
						>AI Prompt</label
					>
					<textarea
						rows={4}
						class="mt-1 w-full rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
						bind:value={createAiPrompt}
						placeholder="Describe what the AI should validate in the photo"
						id="createAiPrompt"
					></textarea>
				</div>
				<div>
					<label
						for="createMinConfidence"
						class="text-sm font-medium text-gray-700 dark:text-slate-200">Min Confidence</label
					>
					<input
						type="number"
						step="0.01"
						min="0"
						max="1"
						class="mt-1 w-full rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
						bind:value={createMinConfidence}
						id="createMinConfidence"
					/>
				</div>
				<div class="md:col-span-2">
					<div class="text-sm font-medium text-gray-700 dark:text-slate-200">
						Assign to Groups (select one or more)
					</div>
					<div class="mt-2 grid gap-2 md:grid-cols-3">
						{#each availableGroups as group}
							<label
								class="flex items-center gap-2 rounded-lg border border-gray-200 p-3 hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-800 cursor-pointer"
							>
								<input
									type="checkbox"
									checked={createSelectedGroupIds.includes(group.id)}
									onchange={() => toggleGroupSelection(group.id, true)}
									class="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer"
								/>
								<span class="text-sm text-gray-700 dark:text-slate-200">{group.name}</span>
							</label>
						{/each}
					</div>
					{#if createSelectedGroupIds.length > 0}
						<div class="mt-2 text-xs text-gray-500 dark:text-slate-400">
							{createSelectedGroupIds.length} group{createSelectedGroupIds.length !== 1 ? 's' : ''} selected
						</div>
					{/if}
				</div>
				<div class="md:col-span-2">
					<button
						type="button"
						onclick={createTask}
						disabled={creating}
						class="w-full rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition-all hover:scale-[1.01] disabled:opacity-50"
					>
						{creating ? 'Creating…' : 'Create Task'}
					</button>
				</div>
			</div>
		</div>

		<div class="rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
			<h2 class="text-lg font-semibold text-gray-800 dark:text-slate-100">Tasks</h2>
			{#if loading}
				<div class="py-8 text-center text-sm text-gray-600 dark:text-slate-300">Loading…</div>
			{:else if tasks.length === 0}
				<div class="py-8 text-center text-sm text-gray-600 dark:text-slate-300">
					No tasks found.
				</div>
			{:else}
				<div class="mt-4 overflow-x-auto">
					<table class="w-full text-left text-sm">
						<thead class="text-xs uppercase text-gray-500 dark:text-slate-400">
							<tr>
								<th class="py-2 pr-4">ID</th>
								<th class="py-2 pr-4">Description</th>
								<th class="py-2 pr-4">Groups</th>
								<th class="py-2 pr-4">Unlock</th>
								<th class="py-2 pr-4">Min Conf</th>
								<th class="py-2 pr-4"></th>
							</tr>
						</thead>
						<tbody>
							{#each tasks as task (task.id)}
								<tr class="border-t border-gray-100 dark:border-slate-800">
									<td class="py-3 pr-4 align-top text-gray-700 dark:text-slate-200">{task.id}</td>
									<td class="py-3 pr-4 align-top">
										{#if editingTaskId === task.id}
											<input
												class="w-full rounded-xl border border-gray-200 bg-white p-2 text-sm text-gray-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
												bind:value={editDescription}
											/>
											<textarea
												rows={3}
												class="mt-2 w-full rounded-xl border border-gray-200 bg-white p-2 text-sm text-gray-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
												bind:value={editAiPrompt}
											></textarea>
										{:else}
											<div class="font-medium text-gray-800 dark:text-slate-100">
												{task.description}
											</div>
											<div
												class="mt-1 whitespace-pre-wrap text-xs text-gray-500 dark:text-slate-400"
											>
												{task.aiPrompt}
											</div>
										{/if}
									</td>
									<td class="py-3 pr-4 align-top">
										{#if editingTaskId === task.id}
											<div class="space-y-1">
												{#each availableGroups as group}
													<label class="flex items-center gap-2 text-xs">
														<input
															type="checkbox"
															checked={editSelectedGroupIds.includes(group.id)}
															onchange={() => toggleGroupSelection(group.id, false)}
															class="h-3 w-3 rounded border-gray-300 text-green-600"
														/>
														<span class="text-gray-700 dark:text-slate-200">{group.name}</span>
													</label>
												{/each}
											</div>
										{:else}
											<div class="flex flex-wrap gap-1">
												{#each task.groups as group}
													<span
														class="rounded-full bg-green-100 px-2 py-1 text-xs text-green-700 dark:bg-green-900/30 dark:text-green-300"
													>
														{group.name}
													</span>
												{/each}
											</div>
										{/if}
									</td>
									<td class="py-3 pr-4 align-top text-gray-700 dark:text-slate-200">
										{#if editingTaskId === task.id}
											<input
												type="datetime-local"
												class="w-full rounded-xl border border-gray-200 bg-white p-2 text-sm text-gray-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
												bind:value={editUnlockDate}
											/>
										{:else}
											{new Date(task.unlockDate).toLocaleString()}
										{/if}
									</td>
									<td class="py-3 pr-4 align-top text-gray-700 dark:text-slate-200">
										{#if editingTaskId === task.id}
											<input
												type="number"
												step="0.01"
												min="0"
												max="1"
												class="w-full rounded-xl border border-gray-200 bg-white p-2 text-sm text-gray-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
												bind:value={editMinConfidence}
											/>
										{:else}
											{task.minConfidence}
										{/if}
									</td>
									<td class="py-3 pr-4 align-top">
										{#if editingTaskId === task.id}
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
													onclick={() => startEdit(task)}
													class="rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
												>
													Edit
												</button>
												<button
													type="button"
													onclick={() => deleteTask(task.id)}
													disabled={deletingId === task.id}
													class="rounded-xl bg-red-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
												>
													{deletingId === task.id ? 'Deleting…' : 'Delete'}
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
