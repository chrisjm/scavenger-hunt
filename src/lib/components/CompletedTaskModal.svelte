<script lang="ts">
	import { X, Trash2, RotateCcw } from 'lucide-svelte';

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

	interface Props {
		show: boolean;
		task: any;
		submission: Submission | null;
		userId: string;
		onClose: () => void;
		onRemove: (submissionId: string) => void;
		onRetry: (task: any) => void;
	}

	let { show, task, submission, userId, onClose, onRemove, onRetry }: Props = $props();

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
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
		<div class="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
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
					<h4 class="mb-3 text-sm font-semibold text-gray-700 uppercase tracking-wide">
						Your Submission
					</h4>
					<div class="relative overflow-hidden rounded-xl border-2 border-gray-200">
						<img
							src={submission.imagePath}
							alt="Your submission"
							class="w-full max-h-80 object-contain bg-gray-50"
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
					<h4 class="mb-3 text-sm font-semibold text-gray-700 uppercase tracking-wide">
						AI Judge Feedback
					</h4>
					<div class="rounded-lg bg-gray-50 p-4">
						<p class="text-gray-700 leading-relaxed">
							<span class="font-medium">"{submission.aiReasoning}"</span>
						</p>
						<div class="mt-3 flex items-center justify-between text-sm text-gray-500">
							<span>Confidence: {Math.round((submission.aiConfidence || 0) * 100)}%</span>
							<span>
								Submitted {new Date(submission.submittedAt).toLocaleDateString()} at{' '}
								{new Date(submission.submittedAt).toLocaleTimeString()}
							</span>
						</div>
					</div>
				</div>

				<!-- Actions -->
				<div class="flex gap-3">
					<button
						onclick={handleRemove}
						disabled={removing}
						class="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-red-200 bg-red-50 py-3 font-semibold text-red-700 transition-all hover:border-red-300 hover:bg-red-100 disabled:opacity-50"
					>
						<Trash2 class="h-4 w-4" />
						{removing ? 'Removing...' : 'Remove Submission'}
					</button>
					<button
						onclick={handleRetry}
						class="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 font-semibold text-white shadow-md transition-all hover:scale-[1.02] hover:shadow-lg"
					>
						<RotateCcw class="h-4 w-4" />
						Try Again
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
