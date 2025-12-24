<script lang="ts">
	import type { PageData } from './$types';
	import { formatRelativeOrDate } from '$lib/utils/date';
	import { ArrowLeft } from 'lucide-svelte';

	let { data }: { data: PageData } = $props();

	const viewerReactionSet = $derived.by(() => new Set(data.viewerReactions));
	const totalReactions = $derived.by(() =>
		data.reactions.reduce((sum, entry) => sum + entry.count, 0)
	);
</script>

<div class="min-h-screen bg-slate-950 text-slate-100">
	<div class="max-w-5xl mx-auto px-4 py-8 md:py-12 space-y-8">
		<a
			href="/submissions"
			class="inline-flex items-center gap-2 text-sm font-semibold text-blue-300 hover:text-blue-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
		>
			<ArrowLeft size={16} />
			<span>Back to submissions</span>
		</a>

		<section class="grid gap-8 lg:grid-cols-2" aria-labelledby="submission-overview">
			<div class="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-2xl backdrop-blur">
				<div class="relative">
					<img
						src={data.submission.imagePath}
						alt={`Submission for ${data.submission.taskDescription}`}
						class="w-full h-64 object-cover rounded-2xl border border-white/20 shadow-lg"
					/>
					<span
						class={`absolute top-3 left-3 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
							data.submission.valid
								? 'bg-emerald-500/90 text-emerald-950'
								: 'bg-rose-500/90 text-rose-50'
						}`}
					>
						{data.submission.valid ? '✅ Approved' : '❌ Rejected'}
					</span>
				</div>
			</div>

			<div
				class="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-2xl backdrop-blur flex flex-col gap-6"
			>
				<div>
					<p class="text-sm uppercase tracking-[0.2em] text-slate-400" id="submission-overview">
						Submission
					</p>
					<h1 class="text-3xl font-bold text-white">{data.submission.taskDescription}</h1>
					<p class="text-slate-300 mt-2">
						Submitted by
						<span class="font-semibold text-white">{data.submission.userName}</span>
						• {formatRelativeOrDate(data.submission.submittedAt)}
					</p>
				</div>

				<dl class="grid gap-4 sm:grid-cols-2" aria-label="Submission reaction summary">
					<div class="rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 p-4">
						<dt class="text-xs uppercase tracking-[0.3em] text-blue-100">Total reactions</dt>
						<dd class="text-3xl font-black text-white mt-2">{totalReactions}</dd>
					</div>
					<div class="rounded-2xl bg-gradient-to-br from-rose-500 to-orange-500 p-4">
						<dt class="text-xs uppercase tracking-[0.3em] text-white/80">Unique emojis</dt>
						<dd class="text-3xl font-black text-white mt-2">{data.reactions.length}</dd>
					</div>
				</dl>
			</div>
		</section>

		<section class="space-y-4" aria-labelledby="reactor-breakdown">
			<div class="flex items-center justify-between flex-wrap gap-3">
				<div>
					<p class="text-sm uppercase tracking-[0.3em] text-slate-400">Activity</p>
					<h2 id="reactor-breakdown" class="text-2xl font-semibold tracking-tight text-white">
						Reactor breakdown
					</h2>
				</div>
				<p class="text-sm text-slate-400">
					Showing {data.reactions.length} emoji
					{data.reactions.length === 1 ? 'reaction' : 'reactions'}
				</p>
			</div>

			{#if data.reactions.length === 0}
				<div class="rounded-3xl border border-dashed border-white/20 bg-white/5 p-10 text-center">
					<p class="text-lg font-medium text-slate-200">No reactions yet</p>
					<p class="text-sm text-slate-400 mt-2">
						Once players start reacting to this submission, their names will appear here.
					</p>
				</div>
			{:else}
				<div class="space-y-4">
					{#each data.reactions as reaction (reaction.emoji)}
						<div
							class="rounded-3xl border border-white/10 bg-white/[0.07] p-5 md:p-6 shadow-xl"
							aria-labelledby={`reaction-${reaction.emoji}`}
						>
							<header class="flex flex-wrap items-center gap-3">
								<div class="flex items-center gap-3">
									<div class="text-3xl" aria-hidden="true">{reaction.emoji}</div>
									<div>
										<p class="text-sm uppercase tracking-[0.25em] text-slate-400">Reactions</p>
										<p id={`reaction-${reaction.emoji}`} class="text-2xl font-bold text-white">
											{reaction.count}
										</p>
									</div>
								</div>

								{#if viewerReactionSet.has(reaction.emoji)}
									<span
										class="ml-auto inline-flex items-center gap-1 rounded-full bg-blue-600/20 px-3 py-1 text-xs font-semibold text-blue-200"
									>
										<span aria-hidden="true">✨</span>
										You reacted
									</span>
								{/if}
							</header>

							<div class="mt-4 space-y-3">
								{#if reaction.reactors.length === 0}
									<p class="text-sm text-slate-400">No visible reactors yet.</p>
								{:else}
									<ul class="space-y-2" aria-label={`Reactor list for ${reaction.emoji}`}>
										{#each reaction.reactors as reactor (reactor.userId + ':' + reaction.emoji)}
											<li
												class="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2"
											>
												<div class="flex-1">
													<p class="font-semibold text-white">{reactor.displayName}</p>
													<p class="text-xs text-slate-400">
														{reactor.reactedAt
															? formatRelativeOrDate(reactor.reactedAt)
															: 'Reaction time unknown'}
													</p>
												</div>
											</li>
										{/each}
									</ul>

									{#if reaction.count > reaction.reactors.length}
										<p class="text-xs text-slate-400">
											+ {reaction.count - reaction.reactors.length} more recent reaction{reaction.count -
												reaction.reactors.length ===
											1
												? ''
												: 's'}
											tracked in the activity log.
										</p>
									{/if}
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</section>
	</div>
</div>
