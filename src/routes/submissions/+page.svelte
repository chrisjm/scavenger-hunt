<script lang="ts">
	import { onMount } from 'svelte';
	import SubmissionsFeed from '$lib/components/SubmissionsFeed.svelte';
	import { getUserContext } from '$lib/stores/user';
	import { Loader } from 'lucide-svelte';

	const userContext = getUserContext();
	const userId = $derived(userContext.userId);
	const isAdmin = $derived(userContext.isAdmin);
	const activeGroupId = $derived(userContext.activeGroupId);

	let submissions = $state<any[]>([]);
	let loading = $state(false);
	let error = $state<string | null>(null);

	async function loadSubmissions() {
		if (!activeGroupId || !userId) return;
		loading = true;
		error = null;
		try {
			const url = isAdmin
				? `/api/submissions/all?groupId=${activeGroupId}`
				: `/api/submissions/all?groupId=${activeGroupId}`; // non-admins are scoped by backend
			const response = await fetch(url);
			if (!response.ok) {
				const data = await response.json().catch(() => ({}));
				throw new Error(data.error || 'Failed to load submissions');
			}
			submissions = await response.json();
		} catch (err) {
			console.error('Failed to load submissions:', err);
			error = err instanceof Error ? err.message : 'Failed to load submissions';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		if (userId && activeGroupId) {
			loadSubmissions();
		}
	});

	$effect(() => {
		if (userId && activeGroupId) {
			loadSubmissions();
		}
	});
</script>

<div
	class="min-h-screen bg-gradient-to-br from-green-50 via-white to-red-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950"
>
	<div class="max-w-5xl mx-auto px-4 py-8 md:py-12">
		<div class="mb-6 md:mb-8 flex items-center justify-between gap-4">
			<div>
				<h1
					class="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-200"
				>
					Submissions
				</h1>
				<p class="mt-2 text-sm md:text-base text-slate-600 dark:text-slate-400">
					All submissions for your active group, including both approved and rejected attempts.
				</p>
			</div>
		</div>

		{#if !activeGroupId}
			<div class="bg-slate-900/60 border border-slate-700 rounded-xl p-6 text-center">
				<p class="text-slate-200 font-medium mb-1">No active group selected</p>
				<p class="text-slate-400 text-sm">
					Join or select a group from the header to see its submissions.
				</p>
			</div>
		{:else if loading}
			<div class="bg-slate-900/60 border border-slate-800 rounded-xl p-6 text-center">
				<div class="flex items-center justify-center gap-3">
					<Loader size={20} class="text-slate-300 animate-spin" />
					<p class="text-slate-200">Loading submissions...</p>
				</div>
			</div>
		{:else if error}
			<div class="bg-red-900/40 border border-red-700 rounded-xl p-6">
				<p class="text-red-200 font-medium mb-1">Unable to load submissions</p>
				<p class="text-red-300 text-sm">{error}</p>
			</div>
		{:else}
			<SubmissionsFeed {submissions} />
		{/if}
	</div>
</div>
