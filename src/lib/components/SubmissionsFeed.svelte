<script lang="ts">
	import SubmissionCard from './SubmissionCard.svelte';

	interface Submission {
		id: string;
		userName: string;
		taskDescription: string;
		imagePath: string;
		valid: boolean;
		aiReasoning: string;
		aiConfidence: number;
		submittedAt: string;
		taskId: number;
	}

	interface Props {
		submissions: Submission[];
	}

	let { submissions }: Props = $props();
</script>

<div
	class="bg-gradient-to-br from-white to-blue-50 rounded-xl shadow-xl p-8 border border-blue-100 dark:from-slate-900 dark:to-slate-900 dark:border-slate-700"
>
	<div class="flex items-center gap-3 mb-6">
		<div
			class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center dark:bg-blue-900/40"
		>
			<span class="text-blue-600 text-xl dark:text-blue-300">📡</span>
		</div>
		<h2 class="text-2xl font-semibold text-gray-800 dark:text-slate-100">Live Submissions Feed</h2>
		{#if submissions.length > 0}
			<div class="ml-auto">
				<div
					class="bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1 rounded-full border border-blue-200"
				>
					{submissions.length} submission{submissions.length === 1 ? '' : 's'}
				</div>
			</div>
		{/if}
	</div>

	{#if submissions.length === 0}
		<div class="text-center py-12">
			<div
				class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 dark:bg-slate-800"
			>
				<span class="text-gray-400 text-2xl dark:text-slate-300">📸</span>
			</div>
			<p class="text-gray-500 text-lg font-medium mb-2 dark:text-slate-200">No submissions yet</p>
			<p class="text-gray-400 dark:text-slate-400">Be the first to share your festive finds!</p>
		</div>
	{:else}
		<div class="space-y-4 max-h-96 overflow-y-auto">
			{#each submissions as submission (submission.id)}
				<SubmissionCard {submission} />
			{/each}
		</div>
	{/if}
</div>
