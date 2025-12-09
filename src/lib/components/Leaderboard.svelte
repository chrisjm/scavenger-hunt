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
				return 'text-yellow-600 bg-yellow-50 border-yellow-200';
			case 2:
				return 'text-gray-600 bg-gray-50 border-gray-200';
			case 3:
				return 'text-amber-600 bg-amber-50 border-amber-200';
			default:
				return 'text-blue-600 bg-blue-50 border-blue-200';
		}
	}
</script>

<div class="space-y-4">
	{#if loading}
		<div class="text-center py-8">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
			<p class="mt-2 text-gray-500">Loading leaderboard...</p>
		</div>
	{:else if leaderboard.length === 0}
		<div class="text-center py-12">
			<div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
				<span class="text-gray-400 text-2xl">🏆</span>
			</div>
			<p class="text-gray-500 text-lg font-medium mb-2">No scores yet</p>
			<p class="text-gray-400">Be the first to get on the leaderboard!</p>
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
							<span class="text-lg font-bold text-gray-700">#{position}</span>
						</div>

						<div class="flex-1">
							<h3 class="font-bold text-lg text-gray-800">{entry.name}</h3>
							<p class="text-sm text-gray-600">Holiday Hunter</p>
						</div>

						<div class="text-right">
							<div
								class="text-2xl font-bold {position === 1
									? 'text-yellow-600'
									: position === 2
										? 'text-gray-600'
										: position === 3
											? 'text-amber-600'
											: 'text-blue-600'}"
							>
								{entry.score}
							</div>
							<div class="text-xs text-gray-500">
								{entry.score === 1 ? 'point' : 'points'}
							</div>
						</div>
					</div>

					{#if position <= 3}
						<div class="mt-3 pt-3 border-t border-gray-200">
							<div class="flex items-center gap-2 text-sm">
								<span class="text-gray-600">
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
			<div class="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
				<div class="flex items-center gap-2 text-green-800">
					<span class="text-lg">🎯</span>
					<span class="text-sm font-medium">
						{leaderboard.length} hunter{leaderboard.length === 1 ? '' : 's'} on the board
					</span>
				</div>
			</div>
		{/if}
	{/if}
</div>
