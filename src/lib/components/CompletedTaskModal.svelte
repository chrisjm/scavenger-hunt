<script lang="ts">
	import { X, Trash2, RotateCcw } from 'lucide-svelte';
	import { formatSubmittedAt } from '$lib/utils/date';

	interface Submission {
		id: string;
		taskId: number;
		photoId: string;
		aiMatch: boolean;
		aiConfidence: number;
		aiReasoning: string;
		valid: boolean;
		submittedAt: string;
		imagePath: string;
	}

	interface Task {
		id: number;
		description: string;
	}

	interface Props {
		show: boolean;
		task: Task;
		submission: Submission | null;
		onClose: () => void;
		onRemove: (submissionId: string) => void;
		onRetry: (task: Task) => void;
	}

	let { show, task, submission, onClose, onRemove, onRetry }: Props = $props();

	let removing = $state(false);

	async function handleRemove() {
		if (!submission) return;

		try {
			removing = true;
			await onRemove(submission.id);
			onClose();
		} catch (error) {
			console.error('Failed to remove submission:', error);
		} finally {
			removing = false;
		}
	}

	function handleRetry() {
		onRetry(task);
		onClose();
	}
</script>

{#if show && task && submission}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm dark:bg-black/80"
	>
		<div class="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
			<!-- Header -->
			<div class="bg-gradient-to-r from-emerald-600 to-green-600 p-4 text-white">
				<div class="flex items-center justify-between">
					<div>
						<h3 class="text-lg font-bold">✅ Completed Task</h3>
						<p class="opacity-90 text-sm">{task.description}</p>
					</div>
					<button onclick={onClose} class="rounded-full p-2 transition-colors hover:bg-white/20">
						<X class="h-5 w-5" />
					</button>
				</div>
			</div>

			<!-- Content -->
			<div class="p-6">
				<!-- Submitted Photo -->
				<div class="mb-6">
					<h4
						class="mb-3 text-sm font-semibold text-gray-700 uppercase tracking-wide dark:text-slate-200"
					>
						Your Submission
					</h4>
					<div
						class="relative overflow-hidden rounded-xl border-2 border-gray-200 dark:border-slate-700"
					>
						<img
							src={submission.imagePath}
							alt="Your submission"
							class="w-full max-h-80 object-contain bg-gray-50 dark:bg-slate-900"
						/>
						<div class="absolute top-3 right-3">
							<div
								class="rounded-full px-3 py-1 text-sm font-semibold {submission.valid
									? 'bg-green-500 text-white'
									: 'bg-red-500 text-white'}"
							>
								{submission.valid ? '✅ Approved' : '❌ Rejected'}
							</div>
						</div>
					</div>
				</div>

				<!-- AI Feedback -->
				<div class="mb-6">
					<h4
						class="mb-3 text-sm font-semibold text-gray-700 uppercase tracking-wide dark:text-slate-200"
					>
						AI Judge Feedback
					</h4>
					<div class="rounded-lg bg-gray-50 p-4 dark:bg-slate-900">
						<p class="text-gray-700 leading-relaxed dark:text-slate-200">
							<span class="font-medium">"{submission.aiReasoning}"</span>
						</p>
						<div
							class="mt-3 flex items-center justify-between text-sm text-gray-500 dark:text-slate-400"
						>
							<span>Confidence: {Math.round((submission.aiConfidence || 0) * 100)}%</span>
							<span>Submitted {formatSubmittedAt(submission.submittedAt)}</span>
						</div>
					</div>
				</div>

				<!-- Actions -->
				<div class="mt-4 flex items-center justify-end gap-3">
					<button
						onclick={handleRemove}
						disabled={removing}
						class="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 hover:border-red-300 disabled:opacity-60 dark:border-red-500/60 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-900/60"
					>
						<Trash2 class="h-4 w-4" />
						{removing ? 'Removing…' : 'Remove'}
					</button>
					<button
						onclick={handleRetry}
						class="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 hover:border-blue-300 dark:border-blue-500/60 dark:bg-slate-900/40 dark:text-blue-200 dark:hover:bg-slate-800/80"
					>
						<RotateCcw class="h-4 w-4" />
						Try Again
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
