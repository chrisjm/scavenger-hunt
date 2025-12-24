<!-- ABOUTME: Admin page to review reaction audit events with filtering and pagination. -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import { formatRelativeOrDate } from '$lib/utils/date';
	import type { ReactionAuditEvent } from '$lib/types/submission';

	const EMOJIS = ['🎉', '🔥', '💡', '😂', '❤️'];

	let loading = $state(false);
	let error = $state<string | null>(null);
	let events = $state<ReactionAuditEvent[]>([]);
	let nextCursor = $state<string | null>(null);
	let query = $state('');
	let actionFilter = $state<'all' | 'add' | 'remove'>('all');
	let emojiFilter = $state<string>('all');
	let submissionFilter = $state('');
	let reactorFilter = $state('');

	onMount(() => {
		refresh();
	});

	async function refresh(cursor: string | null = null) {
		loading = true;
		error = null;
		try {
			const params = new SvelteURLSearchParams();
			params.set('perPage', '50');
			if (cursor) params.set('cursor', cursor);
			if (query.trim()) params.set('q', query.trim());
			if (submissionFilter.trim()) params.set('submissionId', submissionFilter.trim());
			if (reactorFilter.trim()) params.set('reactorId', reactorFilter.trim());
			if (actionFilter !== 'all') params.set('action', actionFilter);
			if (emojiFilter !== 'all') params.set('emoji', emojiFilter);

			const res = await fetch(`/api/admin/reaction-events?${params.toString()}`);
			const data = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(data.error || 'Failed to load reaction events');

			if (!cursor) {
				events = data.events ?? [];
			} else {
				events = [...events, ...(data.events ?? [])];
			}
			nextCursor = data.nextCursor ?? null;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load reaction events';
		} finally {
			loading = false;
		}
	}

	function applyFilters() {
		nextCursor = null;
		refresh(null);
	}

	function clearFilters() {
		query = '';
		actionFilter = 'all';
		emojiFilter = 'all';
		submissionFilter = '';
		reactorFilter = '';
		applyFilters();
	}

	function loadMore() {
		if (nextCursor && !loading) {
			refresh(nextCursor);
		}
	}

	function formatAction(action: 'add' | 'remove') {
		return action === 'add' ? 'Added' : 'Removed';
	}
</script>

<div
	class="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-slate-100 px-4 py-8 md:py-12"
>
	<div class="mx-auto max-w-6xl space-y-8">
		<header class="space-y-2">
			<p class="text-sm uppercase tracking-[0.3em] text-slate-400">Admin</p>
			<h1 class="text-3xl font-bold text-white">Reaction audit trail</h1>
			<p class="text-sm text-slate-400">
				Review every add/remove action across submissions to keep gameplay fair.
			</p>
		</header>

		<section class="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl space-y-6">
			<h2 class="text-lg font-semibold text-white">Filters</h2>
			<form
				class="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
				onsubmit={applyFilters}
				aria-label="Reaction filters"
			>
				<label class="block text-sm font-medium text-slate-300">
					<span class="mb-1 inline-block">Search (task or player)</span>
					<input
						class="w-full rounded-xl border border-white/20 bg-black/20 px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
						placeholder="e.g. Cooper"
						bind:value={query}
						type="text"
					/>
				</label>

				<label class="block text-sm font-medium text-slate-300">
					<span class="mb-1 inline-block">Action</span>
					<select
						class="w-full rounded-xl border border-white/20 bg-black/20 px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
						bind:value={actionFilter}
					>
						<option value="all">All</option>
						<option value="add">Added</option>
						<option value="remove">Removed</option>
					</select>
				</label>

				<label class="block text-sm font-medium text-slate-300">
					<span class="mb-1 inline-block">Emoji</span>
					<select
						class="w-full rounded-xl border border-white/20 bg-black/20 px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
						bind:value={emojiFilter}
					>
						<option value="all">All emojis</option>
						{#each EMOJIS as emoji (emoji)}
							<option value={emoji}>{emoji}</option>
						{/each}
					</select>
				</label>

				<label class="block text-sm font-medium text-slate-300">
					<span class="mb-1 inline-block">Submission ID</span>
					<input
						class="w-full rounded-xl border border-white/20 bg-black/20 px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
						placeholder="Optional"
						bind:value={submissionFilter}
						type="text"
					/>
				</label>

				<label class="block text-sm font-medium text-slate-300">
					<span class="mb-1 inline-block">Reactor user ID</span>
					<input
						class="w-full rounded-xl border border-white/20 bg-black/20 px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
						placeholder="Optional"
						bind:value={reactorFilter}
						type="text"
					/>
				</label>

				<div class="flex items-end gap-3">
					<button
						type="submit"
						class="flex-1 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 disabled:opacity-50"
						disabled={loading}
					>
						Apply
					</button>
					<button
						type="button"
						class="rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40 disabled:opacity-50"
						onclick={clearFilters}
						disabled={loading}
					>
						Reset
					</button>
				</div>
			</form>
		</section>

		<section class="rounded-3xl border border-white/10 bg-white/[0.04] shadow-2xl">
			<header
				class="flex items-center justify-between flex-wrap gap-4 border-b border-white/10 px-6 py-4"
			>
				<div>
					<h2 class="text-lg font-semibold text-white">Events</h2>
					<p class="text-sm text-slate-400">{events.length} shown</p>
				</div>
				{#if loading}
					<p class="text-sm text-slate-400">Loading…</p>
				{/if}
			</header>

			{#if error}
				<div class="px-6 py-4 text-sm text-red-300">{error}</div>
			{:else if !loading && events.length === 0}
				<div class="px-6 py-10 text-center text-sm text-slate-400">
					No events match your filters.
				</div>
			{:else}
				<div class="overflow-x-auto">
					<table class="min-w-full divide-y divide-white/10 text-sm">
						<thead class="text-left text-slate-300">
							<tr>
								<th class="px-6 py-3 font-medium">When</th>
								<th class="px-6 py-3 font-medium">Action</th>
								<th class="px-6 py-3 font-medium">Emoji</th>
								<th class="px-6 py-3 font-medium">Reactor</th>
								<th class="px-6 py-3 font-medium">Submission</th>
								<th class="px-6 py-3 font-medium">Submitter</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-white/5 text-slate-100">
							{#each events as event (event.id)}
								<tr>
									<td class="px-6 py-3">
										{formatRelativeOrDate(event.createdAt)}
									</td>
									<td class="px-6 py-3">
										<span
											class={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
												event.action === 'add'
													? 'bg-emerald-600/30 text-emerald-200'
													: 'bg-rose-600/30 text-rose-200'
											}`}
										>
											{formatAction(event.action)}
										</span>
									</td>
									<td class="px-6 py-3 text-lg" aria-label="Emoji">{event.emoji}</td>
									<td class="px-6 py-3">
										<div class="font-semibold">{event.reactorName}</div>
										<div class="text-xs text-slate-400 break-all">{event.reactorId}</div>
									</td>
									<td class="px-6 py-3">
										<div class="font-semibold">{event.taskDescription}</div>
										<div class="text-xs text-slate-400 break-all">{event.submissionId}</div>
									</td>
									<td class="px-6 py-3">
										<div class="font-semibold">{event.submitterName}</div>
										<div class="text-xs text-slate-400 break-all">{event.submitterId}</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				<div class="border-t border-white/10 px-6 py-4">
					<button
						type="button"
						class="rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40 disabled:opacity-50"
						onclick={loadMore}
						disabled={!nextCursor || loading}
					>
						{nextCursor ? (loading ? 'Loading…' : 'Load more') : 'No more events'}
					</button>
				</div>
			{/if}
		</section>
	</div>
</div>
