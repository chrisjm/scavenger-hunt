<script lang="ts">
	import { resolve } from '$app/paths';
	import { formatRelativeOrDate } from '$lib/utils/date';
	import { buildSubmissionLink } from '$lib/utils/submissionLink';

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
		submission: Submission;
	}

	let { submission }: Props = $props();
</script>

<a
	href={resolve(buildSubmissionLink(submission))}
	class="block group border-2 rounded-xl p-5 transition-all duration-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-green-500 focus-visible:ring-offset-transparent {submission.valid
		? 'border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 hover:border-green-300 dark:border-emerald-500/60 dark:from-emerald-900 dark:to-emerald-800'
		: 'border-red-200 bg-gradient-to-r from-red-50 to-pink-50 hover:border-red-300 dark:border-red-500/60 dark:from-rose-900 dark:to-rose-800'}"
>
	<div class="flex items-start gap-4">
		<div class="relative">
			<img
				src={submission.imagePath}
				alt="Submission"
				class="w-20 h-20 object-cover rounded-xl border-2 border-white shadow-sm group-hover:shadow-md transition-shadow dark:border-slate-800"
			/>
			<div class="absolute -top-2 -right-2">
				<div
					class="w-6 h-6 rounded-full flex items-center justify-center {submission.valid
						? 'bg-green-500'
						: 'bg-red-500'}"
				>
					<span class="text-white text-xs">
						{submission.valid ? '✓' : '✗'}
					</span>
				</div>
			</div>
		</div>

		<div class="flex-1 min-w-0">
			<div class="flex items-center gap-2 mb-2 flex-wrap">
				<span class="font-bold text-gray-800 dark:text-slate-100">
					{submission.userName || 'Anonymous'}
				</span>
				<span class="text-sm text-gray-500 dark:text-slate-400">found</span>
				<span class="font-medium text-gray-700 dark:text-slate-200">
					"{submission.taskDescription}"
				</span>
				<div class="ml-auto">
					<span
						class="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full {submission.valid
							? 'bg-green-100 text-green-800 border border-green-200 dark:bg-emerald-900/60 dark:text-emerald-200 dark:border-emerald-500/70'
							: 'bg-red-100 text-red-800 border border-red-200 dark:bg-rose-900/60 dark:text-rose-200 dark:border-rose-500/70'}"
					>
						<span>{submission.valid ? '✅' : '❌'}</span>
						<span>{submission.valid ? 'Approved' : 'Rejected'}</span>
					</span>
				</div>
			</div>

			<div class="bg-white/60 rounded-lg p-3 mb-2 dark:bg-slate-900/70">
				<p class="text-sm text-gray-700 italic leading-relaxed dark:text-slate-200">
					<span class="font-medium text-gray-600 dark:text-slate-300">AI Judge:</span>
					"{submission.aiReasoning}"
				</p>
			</div>

			<div class="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
				<span class="flex items-center gap-1">
					<span class="w-2 h-2 rounded-full bg-blue-400 dark:bg-blue-300"></span>
					<span>Confidence: {Math.round((submission.aiConfidence || 0) * 100)}%</span>
				</span>
				<span>{formatRelativeOrDate(submission.submittedAt)}</span>
			</div>
		</div>
	</div>
</a>
