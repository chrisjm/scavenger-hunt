<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { Trash2, RotateCcw } from 'lucide-svelte';
	import { getUserContext } from '$lib/stores/user';

	const userContext = getUserContext();
	let userId = $derived(userContext.userId);
	let activeGroupId = $derived(userContext.activeGroupId);

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

	let task: any = $state(null);
	let submission: Submission | null = $state(null);
	let loading = $state(true);
	let removing = $state(false);

	onMount(() => {
		loadData();
	});

	async function loadData() {
		const taskIdParam = page.params.taskId;
		const submissionId = page.params.submissionId;
		const taskId = Number(taskIdParam);

		if (!Number.isFinite(taskId) || !submissionId) {
			goto('/tasks');
			return;
		}

		try {
			// Load all tasks and find the one we need
			const taskRes = await fetch('/api/tasks');
			if (taskRes.ok) {
				const tasks = await taskRes.json();
				task = tasks.find((t: any) => t.id === taskId) ?? null;
			}

			if (!activeGroupId) {
				goto('/tasks');
				return;
			}

			// Load submissions for the current group and find the one we need
			const subRes = await fetch(`/api/submissions/all?groupId=${activeGroupId}`);
			if (subRes.ok) {
				const subs: Submission[] = await subRes.json();
				submission = subs.find((s) => s.id === submissionId) ?? null;
			}
		} catch (error) {
			console.error('Failed to load submission details:', error);
		} finally {
			loading = false;
		}
	}

	async function handleRemove() {
		if (!submission || !userId) return;

		try {
			removing = true;
			const response = await fetch(`/api/submissions/${submission.id}`, {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ userId })
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to remove submission');
			}

			alert('Submission removed successfully! You can now try again.');
			goto('/tasks');
		} catch (error) {
			console.error('Failed to remove submission:', error);
			alert(error instanceof Error ? error.message : 'Failed to remove submission');
		} finally {
			removing = false;
		}
	}

	function handleRetry() {
		const taskIdParam = page.params.taskId;
		goto(`/tasks/${taskIdParam}/submit`);
	}
</script>

<svelte:head>
	<title>Submission Details - Holiday Scavenger Hunt</title>
</svelte:head>

<div
	class="min-h-screen bg-gradient-to-br from-green-50 to-red-50 p-4 dark:from-slate-950 dark:to-slate-950"
>
	<div class="container mx-auto max-w-3xl">
		{#if loading}
			<div class="py-12 text-center">
				<div
					class="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-green-600 dark:border-green-500"
				></div>
				<p class="mt-2 text-gray-500 dark:text-slate-400">Loading submission...</p>
			</div>
		{:else if task && submission}
			<div
				class="overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-2xl dark:shadow-slate-800"
			>
				<div class="bg-gradient-to-r from-emerald-600 to-green-600 p-4 text-white">
					<div class="flex items-center justify-between">
						<div>
							<h1 class="text-lg font-bold dark:text-slate-200">✅ Completed Task</h1>
							<p class="opacity-90 text-sm mt-1 dark:text-slate-400">{task.description}</p>
						</div>
						<button
							type="button"
							onclick={() => goto('/tasks')}
							class="rounded-full px-3 py-1 text-sm font-medium bg-white/10 dark:bg-slate-900/10 hover:bg-white/20 dark:hover:bg-slate-900/20"
						>
							← Back to tasks
						</button>
					</div>
				</div>

				<div class="p-6">
					<div class="mb-6">
						<h2
							class="mb-3 text-sm font-semibold text-gray-700 uppercase tracking-wide dark:text-slate-200"
						>
							Your Submission
						</h2>
						<div
							class="relative overflow-hidden rounded-xl border-2 border-gray-200 dark:border-slate-700"
						>
							<img
								src={submission.imagePath}
								alt="Your submission"
								class="w-full max-h-96 object-contain bg-gray-50 dark:bg-slate-900"
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

					<div class="mb-6">
						<h2
							class="mb-3 text-sm font-semibold text-gray-700 uppercase tracking-wide dark:text-slate-200"
						>
							AI Judge Feedback
						</h2>
						<div class="rounded-lg bg-gray-50 p-4 dark:bg-slate-900">
							<p class="text-gray-700 leading-relaxed dark:text-slate-200">
								<span class="font-medium">"{submission.aiReasoning}"</span>
							</p>
							<div
								class="mt-3 flex items-center justify-between text-sm text-gray-500 dark:text-slate-400"
							>
								<span>Confidence: {Math.round((submission.aiConfidence || 0) * 100)}%</span>
								<span>
									Submitted {new Date(submission.submittedAt).toLocaleDateString()} at
									{new Date(submission.submittedAt).toLocaleTimeString()}
								</span>
							</div>
						</div>
					</div>

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
		{:else}
			<div class="py-12 text-center">
				<p class="text-gray-500">Submission not found.</p>
				<button
					class="mt-4 inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white text-sm font-semibold shadow-sm hover:bg-green-700"
					onclick={() => goto('/tasks')}
				>
					← Back to tasks
				</button>
			</div>
		{/if}
	</div>
</div>
