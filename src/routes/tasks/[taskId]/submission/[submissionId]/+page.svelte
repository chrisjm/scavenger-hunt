<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { Trash2, RotateCcw } from 'lucide-svelte';
	import { getUserContext } from '$lib/stores/user';
	import { formatRelativeOrDate, formatSubmittedAt } from '$lib/utils/date';
	import type { ReactionDetailEntry, ReactionSummary } from '$lib/types/submission';
	import ReactionBar from '$lib/components/ReactionBar.svelte';

	const userContext = getUserContext();
	let userId = $derived(userContext.userId);
	let activeGroupId = $derived(userContext.activeGroupId);

	interface Submission {
		id: string;
		taskId: number;
		photoId: string;
		aiMatch: boolean;
		totalScore: number;
		scoreBreakdown: {
			accuracy: number;
			composition: number;
			vibe: number;
		};
		aiComment: string;
		valid: boolean;
		submittedAt: string;
		imagePath: string;
	}

	async function loadReactionDetails(submissionId: string) {
		reactionsLoading = true;
		reactionsError = null;
		try {
			const res = await fetch(`/api/submissions/${submissionId}/reactions`);
			const data = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(data.error || 'Failed to load reactions');
			reactions = data.reactions ?? [];
			viewerReactions = data.viewerReactions ?? [];
			if (Array.isArray(data.availableEmojis)) {
				availableEmojis = data.availableEmojis;
			}
		} catch (error) {
			console.error('Failed to load reaction details:', error);
			reactionsError = error instanceof Error ? error.message : 'Failed to load reactions';
		} finally {
			reactionsLoading = false;
		}
	}

	interface Task {
		id: number;
		description: string;
		unlocked: boolean;
		unlockDate: string;
	}

	let task = $state<Task | null>(null);
	let submission: Submission | null = $state(null);
	let loading = $state(true);
	let removing = $state(false);
	let reactions = $state<ReactionDetailEntry[]>([]);
	let viewerReactions = $state<string[]>([]);
	let availableEmojis = $state<string[]>([]);
	let reactionsLoading = $state(false);
	let reactionsError = $state<string | null>(null);

	const viewerReactionSet = $derived.by(() => new Set(viewerReactions));
	const totalReactions = $derived.by(() => reactions.reduce((sum, entry) => sum + entry.count, 0));
	const reactionSummaries = $derived.by<ReactionSummary[]>(() =>
		reactions.map((reaction) => ({
			emoji: reaction.emoji,
			count: reaction.count,
			viewerHasReacted: reaction.viewerHasReacted,
			sampleReactors: reaction.reactors.slice(0, 3)
		}))
	);

	async function loadData() {
		const taskIdParam = page.params.taskId;
		const submissionId = page.params.submissionId;
		const taskId = Number(taskIdParam);
		const groupId = activeGroupId;

		if (!Number.isFinite(taskId) || !submissionId) {
			goto(resolve('/tasks'));
			return;
		}

		if (!groupId) {
			return;
		}

		try {
			loading = true;
			// Load all tasks and find the one we need
			const params = activeGroupId ? `?groupId=${activeGroupId}` : '';
			const taskRes = await fetch(`/api/tasks${params}`);
			if (taskRes.ok) {
				const tasks = (await taskRes.json()) as Task[];
				task = tasks.find((t) => t.id === taskId) ?? null;
			}

			// Load submissions for the current group and find the one we need
			const subRes = await fetch(`/api/submissions/all?groupId=${groupId}`);
			if (subRes.ok) {
				const subs: Submission[] = await subRes.json();
				submission = subs.find((s) => s.id === submissionId) ?? null;
				if (submission) {
					await loadReactionDetails(submission.id);
				} else {
					reactions = [];
					viewerReactions = [];
				}
			}
		} catch (error) {
			console.error('Failed to load submission details:', error);
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		if (!browser) return;
		if (!activeGroupId) return;
		loadData();
	});

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
			goto(resolve('/tasks'));
		} catch (error) {
			console.error('Failed to remove submission:', error);
			alert(error instanceof Error ? error.message : 'Failed to remove submission');
		} finally {
			removing = false;
		}
	}

	function handleRetry() {
		const taskIdParam = page.params.taskId;
		goto(resolve(`/tasks/${taskIdParam}/submit`));
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
							<p
								class="mt-1 inline-block rounded-lg bg-white/80 px-2 py-1 text-sm font-semibold text-emerald-900 dark:bg-white/10 dark:text-white"
							>
								{task.description}
							</p>
						</div>
						<button
							type="button"
							onclick={() => goto(resolve('/tasks'))}
							class="rounded-full px-3 py-1 text-sm font-medium bg-white/10 dark:bg-slate-900/10 hover:bg-white/20 dark:hover:bg-slate-900/20"
						>
							← Back to tasks
						</button>
					</div>
				</div>

				<div class="p-6 space-y-8">
					<div>
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

						<ReactionBar
							submissionId={submission.id}
							reactions={reactionSummaries}
							viewerReactionEmojis={viewerReactions}
							{availableEmojis}
						/>
					</div>

					<div>
						<h2
							class="mb-3 text-sm font-semibold text-gray-700 uppercase tracking-wide dark:text-slate-200"
						>
							AI Judge Feedback
						</h2>
						<div class="rounded-lg bg-gray-50 p-5 space-y-4 dark:bg-slate-900">
							<div class="flex flex-wrap items-center gap-3">
								<p class="text-xl font-semibold text-emerald-700 dark:text-emerald-200">
									Score: {submission.totalScore} pts
								</p>
								<div
									class="flex flex-wrap gap-2 text-xs font-semibold text-gray-600 dark:text-slate-300"
								>
									<div class="rounded-full bg-gray-100 px-3 py-1 dark:bg-slate-800/70">
										Accuracy {submission.scoreBreakdown.accuracy}
									</div>
									<div class="rounded-full bg-gray-100 px-3 py-1 dark:bg-slate-800/70">
										Composition {submission.scoreBreakdown.composition}
									</div>
									<div class="rounded-full bg-gray-100 px-3 py-1 dark:bg-slate-800/70">
										Vibe {submission.scoreBreakdown.vibe}
									</div>
								</div>
							</div>
							<p class="text-gray-700 leading-relaxed dark:text-slate-200">
								<span class="font-medium">"{submission.aiComment}"</span>
							</p>
							<p class="text-sm text-gray-500 dark:text-slate-400">
								Submitted {formatSubmittedAt(submission.submittedAt)}
							</p>
						</div>
					</div>

					<section
						class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"
						aria-labelledby="reaction-section"
					>
						<header class="mb-4 flex flex-wrap items-center gap-3">
							<div>
								<p class="text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-slate-400">
									Reactions
								</p>
								<h3
									id="reaction-section"
									class="text-xl font-semibold text-gray-900 dark:text-white"
								>
									Community feedback
								</h3>
							</div>
							<p class="text-sm text-gray-500 dark:text-slate-400">
								{reactions.length} emoji {reactions.length === 1 ? 'reaction' : 'reactions'} • {totalReactions}
								total taps
							</p>
						</header>

						{#if reactionsLoading}
							<p class="text-sm text-gray-500 dark:text-slate-400">Loading reactions…</p>
						{:else if reactionsError}
							<p class="text-sm text-red-600 dark:text-red-300">{reactionsError}</p>
						{:else if reactions.length === 0}
							<div
								class="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center dark:border-slate-700 dark:bg-slate-900/40"
							>
								<p class="text-base font-medium text-gray-700 dark:text-slate-200">
									No reactions yet
								</p>
								<p class="mt-1 text-sm text-gray-500 dark:text-slate-400">
									Once other players react to this submission, their names will appear here.
								</p>
							</div>
						{:else}
							<div class="space-y-4">
								{#each reactions as reaction (reaction.emoji)}
									<div
										class="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-900/60"
										aria-labelledby={`reaction-${reaction.emoji}`}
									>
										<header class="flex flex-wrap items-center gap-3">
											<div class="flex items-center gap-3">
												<div class="text-3xl" aria-hidden="true">{reaction.emoji}</div>
												<div>
													<p
														class="text-xs uppercase tracking-[0.25em] text-gray-500 dark:text-slate-400"
													>
														Reactions
													</p>
													<p
														id={`reaction-${reaction.emoji}`}
														class="text-2xl font-bold text-gray-900 dark:text-white"
													>
														{reaction.count}
													</p>
												</div>
											</div>

											{#if viewerReactionSet.has(reaction.emoji)}
												<span
													class="ml-auto inline-flex items-center gap-1 rounded-full bg-blue-600/10 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-500/20 dark:text-blue-100"
												>
													<span aria-hidden="true">✨</span>
													You reacted
												</span>
											{/if}
										</header>

										<div class="mt-4 space-y-3">
											{#if reaction.reactors.length === 0}
												<p class="text-sm text-gray-500 dark:text-slate-400">
													No visible reactors yet.
												</p>
											{:else}
												<ul class="space-y-2" aria-label={`Reactor list for ${reaction.emoji}`}>
													{#each reaction.reactors as reactor (reactor.userId + ':' + reaction.emoji)}
														<li
															class="flex flex-wrap items-center gap-2 rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
														>
															<div class="flex-1">
																<p class="font-semibold">{reactor.displayName}</p>
																<p class="text-xs text-gray-500 dark:text-slate-400">
																	{reactor.reactedAt
																		? formatRelativeOrDate(reactor.reactedAt)
																		: 'Reaction time unknown'}
																</p>
															</div>
														</li>
													{/each}
												</ul>

												{#if reaction.count > reaction.reactors.length}
													<p class="text-xs text-gray-500 dark:text-slate-400">
														+ {reaction.count - reaction.reactors.length} more recent reaction{reaction.count -
															reaction.reactors.length ===
														1
															? ''
															: 's'} not shown.
													</p>
												{/if}
											{/if}
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</section>

					<div class="flex flex-wrap items-center justify-end gap-3">
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
			<div class="p-6 space-y-8">
				<div>
					<h2
						class="mb-3 text-sm font-semibold text-gray-700 uppercase tracking-wide dark:text-slate-200"
					>
						Your Submission
					</h2>
					<div
						class="relative overflow-hidden rounded-xl border-2 border-gray-200 dark:border-slate-700"
					>
						<img
							src={submission?.imagePath}
							alt="Your submission"
							class="w-full max-h-96 object-contain bg-gray-50 dark:bg-slate-900"
						/>
						<div class="absolute top-3 right-3">
							<div
								class="rounded-full px-3 py-1 text-sm font-semibold {submission?.valid
									? 'bg-green-500 text-white'
									: 'bg-red-500 text-white'}"
							>
								{submission?.valid ? '✅ Approved' : '❌ Rejected'}
							</div>
						</div>
					</div>
				</div>

				<div>
					<h2
						class="mb-3 text-sm font-semibold text-gray-700 uppercase tracking-wide dark:text-slate-200"
					>
						AI Judge Feedback
					</h2>
					<div class="rounded-lg bg-gray-50 p-4 dark:bg-slate-900">
						<p class="text-gray-700 leading-relaxed dark:text-slate-200">Awaiting judge results…</p>
					</div>
				</div>

				<div class="flex flex-wrap items-center justify-end gap-3">
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
		{/if}
	</div>
</div>
