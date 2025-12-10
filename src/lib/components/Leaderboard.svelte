<script lang="ts">
	interface LeaderboardEntry {
		name: string;
		score: number;
	}

	interface Props {
		leaderboard: LeaderboardEntry[];
		loading: boolean;
	}

	let { leaderboard, loading }: Props = $props();

	function getPositionEmoji(position: number): string {
		switch (position) {
			case 1:
				return '🥇';
			case 2:
				return '🥈';
			case 3:
				return '🥉';
			default:
				return '🏅';
		}
	}

	function getPositionColor(position: number): string {
		switch (position) {
			case 1:
				return 'text-yellow-600 bg-yellow-50 border-yellow-200 dark:text-yellow-300 dark:bg-yellow-900/40 dark:border-yellow-500/60';
			case 2:
				return 'text-gray-600 bg-gray-50 border-gray-200 dark:text-slate-200 dark:bg-slate-900/60 dark:border-slate-600';
			case 3:
				return 'text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-900/40 dark:border-amber-500/60';
			default:
				return 'text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-300 dark:bg-blue-900/40 dark:border-blue-500/60';
		}
	}
</script>

<div class="space-y-4">
	{#if loading}
		<div class="text-center py-8">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
			<p class="mt-2 text-gray-500 dark:text-slate-400">Loading leaderboard...</p>
		</div>
	{:else if leaderboard.length === 0}
		<div class="text-center py-12">
			<div
				class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 dark:bg-slate-800"
			>
				<span class="text-gray-400 text-2xl dark:text-slate-300">🏆</span>
			</div>
			<p class="text-gray-500 text-lg font-medium mb-2 dark:text-slate-200">No scores yet</p>
			<p class="text-gray-400 dark:text-slate-400">Be the first to get on the leaderboard!</p>
		</div>
	{:else}
		<div class="space-y-3">
			{#each leaderboard as entry, index (entry.name)}
				{@const position = index + 1}
				<div
					class="group border-2 rounded-xl p-4 transition-all duration-300 hover:shadow-md {getPositionColor(
						position
					)} hover:scale-[1.02]"
				>
					<div class="flex items-center gap-4">
						<div class="flex items-center gap-2">
							<span class="text-2xl">{getPositionEmoji(position)}</span>
							<span class="text-lg font-bold text-gray-700 dark:text-slate-200">#{position}</span>
						</div>

						<div class="flex-1">
							<h3 class="font-bold text-lg text-gray-800 dark:text-slate-100">{entry.name}</h3>
							<p class="text-sm text-gray-600 dark:text-slate-400">Holiday Hunter</p>
						</div>

						<div class="text-right">
							<div
								class="text-2xl font-bold {position === 1
									? 'text-yellow-600 dark:text-yellow-300'
									: position === 2
										? 'text-gray-600 dark:text-slate-200'
										: position === 3
											? 'text-amber-600 dark:text-amber-300'
											: 'text-blue-600 dark:text-blue-300'}"
							>
								{entry.score}
							</div>
							<div class="text-xs text-gray-500 dark:text-slate-400">
								{entry.score === 1 ? 'point' : 'points'}
							</div>
						</div>
					</div>

					{#if position <= 3}
						<div class="mt-3 pt-3 border-t border-gray-200 dark:border-slate-700">
							<div class="flex items-center gap-2 text-sm">
								<span class="text-gray-600 dark:text-slate-300">
									{#if position === 1}
										🌟 Champion Hunter!
									{:else if position === 2}
										⭐ Expert Finder!
									{:else}
										✨ Great Hunter!
									{/if}
								</span>
							</div>
						</div>
					{/if}
				</div>
			{/each}
		</div>

		{#if leaderboard.length > 0}
			<div
				class="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg dark:bg-emerald-900/40 dark:border-emerald-500/60"
			>
				<div class="flex items-center gap-2 text-green-800 dark:text-emerald-200">
					<span class="text-lg">🎯</span>
					<span class="text-sm font-medium">
						{leaderboard.length} hunter{leaderboard.length === 1 ? '' : 's'} on the board
					</span>
				</div>
			</div>
		{/if}
	{/if}
</div>
