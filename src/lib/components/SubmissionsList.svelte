<script lang="ts">
	import SubmissionCard from './SubmissionCard.svelte';
	import type { SubmissionListItem } from '$lib/types/submission';

	interface Props {
		submissions: SubmissionListItem[];
		title?: string;
		subtitle?: string;
		emptyTitle?: string;
		emptySubtitle?: string;
	}

	let {
		submissions,
		title = 'Submissions',
		subtitle = 'Live feed',
		emptyTitle = 'No submissions yet',
		emptySubtitle = 'Be the first to share your festive finds!'
	}: Props = $props();
</script>

<section class="rounded-2xl border border-slate-800/60 bg-white dark:bg-slate-900/70 p-6">
	<header class="flex items-center gap-3 mb-6">
		<div
			class="w-10 h-10 rounded-full bg-blue-500/15 text-blue-300 flex items-center justify-center"
		>
			<span class="text-xl">📡</span>
		</div>
		<div>
			<p class="text-xs uppercase tracking-[0.18em] text-slate-500">{subtitle}</p>
			<h2 class="text-2xl font-semibold text-gray-900 dark:text-white">{title}</h2>
		</div>
		{#if submissions.length > 0}
			<div class="ml-auto">
				<div
					class="bg-blue-500/10 text-blue-800 text-xs font-semibold px-3 py-1 rounded-full border border-blue-500/30 dark:text-blue-100"
				>
					{submissions.length} submission{submissions.length === 1 ? '' : 's'}
				</div>
			</div>
		{/if}
	</header>

	{#if submissions.length === 0}
		<div class="text-center py-12">
			<div
				class="w-16 h-16 bg-slate-800/80 rounded-full flex items-center justify-center mx-auto mb-4"
			>
				<span class="text-slate-400 text-2xl">📸</span>
			</div>
			<p class="text-slate-100 text-lg font-medium mb-2">{emptyTitle}</p>
			<p class="text-slate-400">{emptySubtitle}</p>
		</div>
	{:else}
		<div class="space-y-4">
			{#each submissions as submission (submission.id)}
				<SubmissionCard {submission} />
			{/each}
		</div>
	{/if}
</section>
