<script lang="ts">
	import { browser } from '$app/environment';
	import SubmissionsList from '$lib/components/SubmissionsList.svelte';
	import type { SubmissionListItem } from '$lib/types/submission';
	import { getUserContext } from '$lib/stores/user';
	import { Loader } from 'lucide-svelte';

	const userContext = getUserContext();
	const userId = $derived(userContext.userId);
	const activeGroupId = $derived(userContext.activeGroupId);

	let submissions = $state<SubmissionListItem[]>([]);
	let loading = $state(false);
	let error = $state<string | null>(null);

	async function loadSubmissions() {
		if (!activeGroupId || !userId) return;
		loading = true;
		error = null;
		try {
			const response = await fetch(`/api/submissions/all?groupId=${activeGroupId}`);
			if (!response.ok) {
				const data = await response.json().catch(() => ({}));
				throw new Error(data.error || 'Failed to load submissions');
			}
			const all = (await response.json()) as SubmissionListItem[];
			submissions = all.filter((sub) => sub.userId === userId);
		} catch (err) {
			console.error('Failed to load submissions:', err);
			error = err instanceof Error ? err.message : 'Failed to load submissions';
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		if (!browser) return;
		if (userId && activeGroupId) {
			loadSubmissions();
		}
	});
</script>

<div
	class="min-h-screen bg-gradient-to-br from-green-50 via-white to-red-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950"
>
	<div class="max-w-5xl mx-auto px-4 py-8 md:py-12">
		<div class="mb-6 md:mb-8">
			<div>
				<h1
					class="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-200"
				>
					My submissions
				</h1>
				<p class="mt-2 text-sm md:text-base text-slate-600 dark:text-slate-400">
					All your submissions in the active group, including both approved and rejected attempts.
				</p>
			</div>
		</div>

		{#if !activeGroupId}
			<div class="bg-slate-900/60 border border-slate-700 rounded-xl p-6 text-center">
				<p class="text-slate-200 font-medium mb-1">No active group selected</p>
				<p class="text-slate-400 text-sm">
					Join or select a group from the header to see your submissions.
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
			<SubmissionsList
				{submissions}
				title="My submissions"
				subtitle="Personal history"
				emptyTitle="No submissions yet"
				emptySubtitle="Submit a photo for a task to start building your history."
			/>
		{/if}
	</div>
</div>
