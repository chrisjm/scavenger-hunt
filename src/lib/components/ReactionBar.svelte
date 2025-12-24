<script lang="ts">
	import { getUserContext } from '$lib/stores/user';
	import type { ReactionSummary } from '$lib/types/submission';

	interface Props {
		submissionId: string;
		reactions: ReactionSummary[];
		viewerReactionEmojis: string[];
		availableEmojis: string[];
	}

	const userContext = getUserContext();
	const userId = $derived(userContext.userId);

	let { submissionId, reactions, viewerReactionEmojis, availableEmojis }: Props = $props();

	let pendingEmoji: string | null = $state(null);
	let errorMessage: string | null = $state(null);

	const reactionMap = $derived.by(() => {
		const map = new Map<string, ReactionSummary>();
		for (const reaction of reactions) {
			map.set(reaction.emoji, reaction);
		}
		return map;
	});

	let orderedEmojis = $state<ReactionSummary[]>([]);

	$effect(() => {
		orderedEmojis = availableEmojis.map((emoji) => {
			return (
				reactionMap.get(emoji) ?? {
					emoji,
					count: 0,
					viewerHasReacted: viewerReactionEmojis.includes(emoji),
					sampleReactors: []
				}
			);
		});
	});

	function optimisticUpdate(emoji: string, isAdding: boolean) {
		const nextViewer = new Set(viewerReactionEmojis);
		if (isAdding) {
			nextViewer.add(emoji);
		} else {
			nextViewer.delete(emoji);
		}
		viewerReactionEmojis = Array.from(nextViewer);

		const nextReactions = orderedEmojis.map((item) => {
			if (item.emoji !== emoji) return item;
			const delta = isAdding ? 1 : -1;
			const nextCount = Math.max(0, item.count + delta);
			return {
				...item,
				count: nextCount,
				viewerHasReacted: isAdding ? true : nextCount > 0 && nextViewer.has(emoji),
				sampleReactors: item.sampleReactors
			};
		});
		reactions = nextReactions;
	}

	async function toggleReaction(emoji: string) {
		if (!userId || pendingEmoji) return;
		errorMessage = null;
		const isActive = viewerReactionEmojis.includes(emoji);
		const method = isActive ? 'DELETE' : 'POST';

		pendingEmoji = emoji;
		optimisticUpdate(emoji, !isActive);

		try {
			const response = await fetch(`/api/submissions/${submissionId}/reactions`, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ emoji })
			});
			if (!response.ok) {
				const data = await response.json().catch(() => ({}));
				throw new Error(data.error || 'Reaction update failed');
			}

			const payload = await response.json();
			reactions = payload.reactions ?? [];
			viewerReactionEmojis = payload.viewerReactions ?? payload.viewerReactionEmojis ?? [];
			if (Array.isArray(payload.availableEmojis)) {
				availableEmojis = payload.availableEmojis;
			}
		} catch (err) {
			console.error('Failed to toggle reaction', err);
			errorMessage = err instanceof Error ? err.message : 'Reaction update failed';
		} finally {
			pendingEmoji = null;
		}
	}
</script>

<div class="mt-4 border-t border-slate-200 dark:border-slate-800 pt-4">
	<div class="flex items-center gap-3 flex-wrap">
		{#each orderedEmojis as reaction (reaction.emoji)}
			<button
				class={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-medium transition border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60 ${viewerReactionEmojis.includes(reaction.emoji) ? 'bg-blue-600 border-blue-600 text-white hover:border-blue-500 hover:bg-blue-500' : 'bg-white dark:bg-slate-900'}`}
				type="button"
				onclick={() => toggleReaction(reaction.emoji)}
				aria-label={`${
					viewerReactionEmojis.includes(reaction.emoji) ? 'Remove' : 'Add'
				} ${reaction.emoji} reaction`}
				disabled={!userId || pendingEmoji === reaction.emoji}
			>
				<span class="text-lg">{reaction.emoji}</span>
				<span class="text-xs font-semibold">{reaction.count}</span>
			</button>
		{/each}

		<a
			class="ml-auto text-xs font-semibold text-blue-600 dark:text-blue-300 hover:underline"
			href={`/submissions/${submissionId}/reactions`}
		>
			View all reactions
		</a>
	</div>
</div>
