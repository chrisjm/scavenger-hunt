<!-- ABOUTME: Admin UI page to list and search users in the system. -->
<!-- ABOUTME: Calls the admin users API and renders a read-only table for administration. -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { getUserContext } from '$lib/stores/user';

	const userContext = getUserContext();
	const currentUserId = $derived(userContext.userId);

	type AdminUser = {
		id: string;
		displayName: string;
		isAdmin: boolean;
		createdAt: string;
		lastLoginAt: string | null;
	};

	type AdminGroup = {
		id: string;
		name: string;
		description: string | null;
	};

	type UserGroupMembership = {
		id: string;
		name: string;
		description: string | null;
		joinedAt: string | null;
	};

	let loading = $state(true);
	let error = $state<string | null>(null);
	let users = $state<AdminUser[]>([]);
	let query = $state('');
	let updatingUserId = $state<string | null>(null);
	let expandedUserId = $state<string | null>(null);
	let groups = $state<AdminGroup[]>([]);
	let membershipsByUserId = $state<Record<string, UserGroupMembership[]>>({});
	let groupsLoading = $state(false);
	let groupsLoadingUserId = $state<string | null>(null);
	let groupActionUserId = $state<string | null>(null);
	let addGroupId = $state('');

	onMount(() => {
		load();
	});

	async function load() {
		loading = true;
		error = null;
		try {
			const res = await fetch('/api/admin/users');
			const data = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(data.error || 'Failed to load users');
			users = (data.users ?? []) as AdminUser[];
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load users';
		} finally {
			loading = false;
		}
	}

	function matchesQuery(user: AdminUser, normalized: string) {
		return (
			user.displayName.toLowerCase().includes(normalized) ||
			user.id.toLowerCase().includes(normalized)
		);
	}

	let filteredUsers = $derived.by(() => {
		const normalized = query.trim().toLowerCase();
		if (!normalized) return users;
		return users.filter((user) => matchesQuery(user, normalized));
	});

	function formatDate(value: string) {
		const d = new Date(value);
		if (Number.isNaN(d.getTime())) return value;
		return d.toLocaleString();
	}

	function formatLastLogin(value: string | null) {
		if (!value) return 'Never';
		return formatDate(value);
	}

	function formatJoinedAt(value: string | null) {
		if (!value) return 'Unknown';
		return formatDate(value);
	}

	async function ensureGroupsLoaded() {
		if (groups.length) return;
		groupsLoading = true;
		try {
			const res = await fetch('/api/admin/groups');
			const data = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(data.error || 'Failed to load groups');
			groups = (data.groups ?? []).map((g: any) => ({
				id: String(g.id),
				name: String(g.name),
				description: typeof g.description === 'string' ? g.description : null
			})) as AdminGroup[];
		} finally {
			groupsLoading = false;
		}
	}

	async function loadUserGroups(userId: string) {
		groupsLoadingUserId = userId;
		try {
			const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/groups`);
			const data = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(data.error || 'Failed to load user groups');
			membershipsByUserId = {
				...membershipsByUserId,
				[userId]: (data.groups ?? []) as UserGroupMembership[]
			};
		} finally {
			groupsLoadingUserId = null;
		}
	}

	async function toggleGroups(userId: string) {
		error = null;
		if (expandedUserId === userId) {
			expandedUserId = null;
			addGroupId = '';
			return;
		}
		expandedUserId = userId;
		addGroupId = '';
		try {
			await ensureGroupsLoaded();
			await loadUserGroups(userId);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load group memberships';
		}
	}

	let availableGroups = $derived.by(() => {
		if (!expandedUserId) return [] as AdminGroup[];
		const memberships = membershipsByUserId[expandedUserId] ?? [];
		const memberIds = new Set(memberships.map((m) => m.id));
		return groups.filter((g) => !memberIds.has(g.id));
	});

	async function addMembership(userId: string) {
		if (!addGroupId) return;
		groupActionUserId = userId;
		error = null;
		try {
			const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/groups`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ groupId: addGroupId })
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(data.error || 'Failed to add user to group');
			await loadUserGroups(userId);
			if (userId === currentUserId) {
				await userContext.refreshGroups().catch(() => null);
			}
			addGroupId = '';
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to add user to group';
		} finally {
			groupActionUserId = null;
		}
	}

	async function removeMembership(userId: string, groupId: string) {
		const ok = confirm('Remove this user from the group?');
		if (!ok) return;
		groupActionUserId = userId;
		error = null;
		try {
			const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/groups`, {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ groupId })
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(data.error || 'Failed to remove user from group');
			await loadUserGroups(userId);
			if (userId === currentUserId) {
				await userContext.refreshGroups().catch(() => null);
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to remove user from group';
		} finally {
			groupActionUserId = null;
		}
	}

	async function setAdmin(user: AdminUser, nextIsAdmin: boolean) {
		if (user.id === currentUserId && user.isAdmin && !nextIsAdmin) {
			error = 'You cannot remove your own admin privileges.';
			return;
		}
		if (user.isAdmin && !nextIsAdmin) {
			const ok = confirm(`Remove admin access for ${user.displayName}?`);
			if (!ok) return;
		}
		updatingUserId = user.id;
		error = null;
		try {
			const res = await fetch(`/api/admin/users/${encodeURIComponent(user.id)}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ isAdmin: nextIsAdmin })
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(data.error || 'Failed to update user');
			await load();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to update user';
		} finally {
			updatingUserId = null;
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
				<h1 class="text-2xl font-bold text-gray-800 dark:text-slate-100">Admin: Users</h1>
				<p class="mt-2 text-sm text-gray-600 dark:text-slate-300">
					View users and search by name or id.
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
			<div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
				<div class="flex-1">
					<label for="userSearch" class="text-sm font-medium text-gray-700 dark:text-slate-200"
						>Search</label
					>
					<input
						id="userSearch"
						class="mt-1 w-full rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
						bind:value={query}
						placeholder="Search by name or id"
					/>
				</div>
				<div class="md:pl-4">
					<button
						type="button"
						onclick={load}
						disabled={loading}
						class="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
					>
						{loading ? 'Loading…' : 'Refresh'}
					</button>
				</div>
			</div>
		</div>

		<div class="rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
			<h2 class="text-lg font-semibold text-gray-800 dark:text-slate-100">Users</h2>
			{#if loading}
				<div class="py-8 text-center text-sm text-gray-600 dark:text-slate-300">Loading…</div>
			{:else if filteredUsers.length === 0}
				<div class="py-8 text-center text-sm text-gray-600 dark:text-slate-300">
					No users found.
				</div>
			{:else}
				<div class="mt-4 overflow-x-auto">
					<table class="w-full text-left text-sm">
						<thead class="text-xs uppercase text-gray-500 dark:text-slate-400">
							<tr>
								<th class="py-2 pr-4">Name</th>
								<th class="py-2 pr-4">Admin</th>
								<th class="py-2 pr-4">Last Login</th>
								<th class="py-2 pr-4">Created</th>
								<th class="py-2 pr-4">User Id</th>
								<th class="py-2 pr-4"></th>
							</tr>
						</thead>
						<tbody>
							{#each filteredUsers as user (user.id)}
								<tr class="border-t border-gray-100 dark:border-slate-800">
									<td class="py-3 pr-4 align-top">
										<div class="font-medium text-gray-800 dark:text-slate-100">
											{user.displayName}
										</div>
									</td>
									<td class="py-3 pr-4 align-top">
										{#if user.isAdmin}
											<span
												class="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700 dark:bg-emerald-900/50 dark:text-emerald-200"
												>Admin</span
											>
										{:else}
											<span
												class="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700 dark:bg-slate-800 dark:text-slate-200"
												>Player</span
											>
										{/if}
									</td>
									<td class="py-3 pr-4 align-top text-gray-700 dark:text-slate-200">
										{formatLastLogin(user.lastLoginAt)}
									</td>
									<td class="py-3 pr-4 align-top text-gray-700 dark:text-slate-200">
										{formatDate(user.createdAt)}
									</td>
									<td
										class="py-3 pr-4 align-top font-mono text-xs text-gray-600 dark:text-slate-300"
									>
										{user.id}
									</td>
									<td class="py-3 pr-4 align-top">
										<div class="flex flex-wrap gap-2">
											<button
												type="button"
												onclick={() => setAdmin(user, !user.isAdmin)}
												disabled={updatingUserId === user.id ||
													(user.id === currentUserId && user.isAdmin)}
												class="rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
											>
												{#if updatingUserId === user.id}
													Saving…
												{:else if user.id === currentUserId && user.isAdmin}
													Admin (you)
												{:else if user.isAdmin}
													Remove admin
												{:else}
													Make admin
												{/if}
											</button>
											<button
												type="button"
												onclick={() => toggleGroups(user.id)}
												disabled={groupsLoadingUserId === user.id}
												class="rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
											>
												{#if expandedUserId === user.id}
													Hide groups
												{:else if groupsLoadingUserId === user.id}
													Loading…
												{:else}
													Groups
												{/if}
											</button>
										</div>
									</td>
								</tr>
								{#if expandedUserId === user.id}
									<tr class="border-t border-gray-100 dark:border-slate-800">
										<td colspan="6" class="py-4 pr-4">
											<div class="rounded-xl border border-gray-200 p-4 dark:border-slate-800">
												<div class="text-sm font-semibold text-gray-800 dark:text-slate-100">
													Groups for {user.displayName}
												</div>
												<div class="mt-3 grid gap-3 md:grid-cols-2">
													<div>
														<div
															class="text-xs font-semibold uppercase text-gray-500 dark:text-slate-400"
														>
															Memberships
														</div>
														{#if groupsLoadingUserId === user.id}
															<div class="mt-2 text-sm text-gray-600 dark:text-slate-300">
																Loading…
															</div>
														{:else if (membershipsByUserId[user.id] ?? []).length === 0}
															<div class="mt-2 text-sm text-gray-600 dark:text-slate-300">
																No groups.
															</div>
														{:else}
															<div class="mt-2 space-y-2">
																{#each membershipsByUserId[user.id] ?? [] as membership (membership.id)}
																	<div
																		class="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2 dark:bg-slate-950"
																	>
																		<div class="min-w-0">
																			<div
																				class="truncate text-sm font-medium text-gray-800 dark:text-slate-100"
																			>
																				{membership.name}
																			</div>
																			<div class="mt-0.5 text-xs text-gray-600 dark:text-slate-300">
																				Joined {formatJoinedAt(membership.joinedAt)}
																			</div>
																		</div>
																		<button
																			type="button"
																			onclick={() => removeMembership(user.id, membership.id)}
																			disabled={groupActionUserId === user.id}
																			class="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
																		>
																			Remove
																		</button>
																	</div>
																{/each}
															</div>
														{/if}
													</div>

													<div>
														<div
															class="text-xs font-semibold uppercase text-gray-500 dark:text-slate-400"
														>
															Add to group
														</div>
														{#if groupsLoading}
															<div class="mt-2 text-sm text-gray-600 dark:text-slate-300">
																Loading groups…
															</div>
														{:else}
															<div class="mt-2 flex flex-col gap-2 md:flex-row">
																<select
																	class="w-full rounded-xl border border-gray-200 bg-white p-2 text-sm text-gray-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
																	bind:value={addGroupId}
																>
																	<option value="">Select group…</option>
																	{#each availableGroups as g (g.id)}
																		<option value={g.id}>{g.name}</option>
																	{/each}
																</select>
																<button
																	type="button"
																	onclick={() => addMembership(user.id)}
																	disabled={!addGroupId || groupActionUserId === user.id}
																	class="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
																>
																	{groupActionUserId === user.id ? 'Adding…' : 'Add'}
																</button>
															</div>
															{#if availableGroups.length === 0}
																<div class="mt-2 text-sm text-gray-600 dark:text-slate-300">
																	No available groups to add.
																</div>
															{/if}
														{/if}
													</div>
												</div>
											</div></td
										>
									</tr>
								{/if}
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	</div>
</div>
