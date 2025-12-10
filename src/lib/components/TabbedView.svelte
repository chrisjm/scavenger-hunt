<script lang="ts">
	import SubmissionsFeed from './SubmissionsFeed.svelte';
	import Leaderboard from './Leaderboard.svelte';

	interface Submission {
		id: string;
		userName: string;
		taskDescription: string;
		imagePath: string;
		valid: boolean;
		aiReasoning: string;
		aiConfidence: number;
		submittedAt: string;
	}

	interface LeaderboardEntry {
		name: string;
		score: number;
	}

	interface Props {
		submissions: Submission[];
		leaderboard: LeaderboardEntry[];
		leaderboardLoading: boolean;
	}

	let { submissions, leaderboard, leaderboardLoading }: Props = $props();
	let activeTab = $state<'feed' | 'leaderboard'>('feed');
</script>

<div
	class="bg-gradient-to-br from-white to-blue-50 rounded-xl shadow-xl p-4 md:p-8 border border-blue-100 dark:from-slate-900 dark:to-slate-900 dark:border-slate-700"
>
	<!-- Mobile-First Tab Headers -->
	<div class="mb-4 md:mb-6">
		<!-- Mobile: Stacked layout -->
		<div class="md:hidden">
			<div class="flex items-center gap-2 mb-3">
				<div
					class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center dark:bg-blue-900/40"
				>
					<span class="text-blue-600 text-lg dark:text-blue-300">📡</span>
				</div>
				<h2 class="text-lg font-semibold text-gray-800 dark:text-slate-100">Community</h2>
			</div>
			<div class="flex bg-gray-100 rounded-lg p-0.5 w-full dark:bg-slate-800">
				<button
					onclick={() => (activeTab = 'feed')}
					class="flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all duration-200 {activeTab ===
					'feed'
						? 'bg-white text-blue-600 shadow-sm dark:bg-slate-900 dark:text-blue-300'
						: 'text-gray-600 dark:text-slate-300'}"
				>
					📡 Feed
					{#if submissions.length > 0}
						<span class="ml-1 text-xs">({submissions.length})</span>
					{/if}
				</button>
				<button
					onclick={() => (activeTab = 'leaderboard')}
					class="flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all duration-200 {activeTab ===
					'leaderboard'
						? 'bg-white text-blue-600 shadow-sm dark:bg-slate-900 dark:text-blue-300'
						: 'text-gray-600 dark:text-slate-300'}"
				>
					🏆 Board
					{#if leaderboard.length > 0}
						<span class="ml-1 text-xs">({leaderboard.length})</span>
					{/if}
				</button>
			</div>
		</div>

		<!-- Desktop: Original layout -->
		<div class="hidden md:flex items-center gap-3">
			<div
				class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center dark:bg-blue-900/40"
			>
				<span class="text-blue-600 text-xl dark:text-blue-300">📡</span>
			</div>
			<h2 class="text-2xl font-semibold text-gray-800 dark:text-slate-100">Community Activity</h2>

			<div class="ml-auto flex bg-gray-100 rounded-lg p-1 dark:bg-slate-800">
				<button
					onclick={() => (activeTab = 'feed')}
					class="px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 {activeTab ===
					'feed'
						? 'bg-white text-blue-600 shadow-sm dark:bg-slate-900 dark:text-blue-300'
						: 'text-gray-600 hover:text-gray-800 dark:text-slate-300 dark:hover:text-slate-100'}"
				>
					📡 Live Feed
					{#if submissions.length > 0}
						<span class="ml-1 bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
							{submissions.length}
						</span>
					{/if}
				</button>
				<button
					onclick={() => (activeTab = 'leaderboard')}
					class="px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 {activeTab ===
					'leaderboard'
						? 'bg-white text-blue-600 shadow-sm dark:bg-slate-900 dark:text-blue-300'
						: 'text-gray-600 hover:text-gray-800 dark:text-slate-300 dark:hover:text-slate-100'}"
				>
					🏆 Leaderboard
					{#if leaderboard.length > 0}
						<span class="ml-1 bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">
							{leaderboard.length}
						</span>
					{/if}
				</button>
			</div>
		</div>
	</div>

	<!-- Tab Content -->
	<div class="min-h-[200px] md:min-h-[300px]">
		{#if activeTab === 'feed'}
			<div class="transition-all duration-300">
				{#if submissions.length === 0}
					<div class="text-center py-8 md:py-12">
						<div
							class="w-12 h-12 md:w-16 md:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4 dark:bg-slate-800"
						>
							<span class="text-gray-400 text-xl md:text-2xl dark:text-slate-300">📸</span>
						</div>
						<p
							class="text-gray-500 text-base md:text-lg font-medium mb-1 md:mb-2 dark:text-slate-200"
						>
							No submissions yet
						</p>
						<p class="text-gray-400 text-sm md:text-base dark:text-slate-400">
							Be the first to share your festive finds!
						</p>
					</div>
				{:else}
					<div class="space-y-3 md:space-y-4 max-h-80 md:max-h-96 overflow-y-auto">
						{#each submissions as submission (submission.id)}
							<div
								class="group border-2 rounded-xl p-3 md:p-5 transition-all duration-300 hover:shadow-md {submission.valid
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
											<span class="font-bold text-gray-800 dark:text-slate-100"
												>{submission.userName || 'Anonymous'}</span
											>
											<span class="text-sm text-gray-500 dark:text-slate-400">found</span>
											<span class="font-medium text-gray-700 dark:text-slate-200"
												>"{submission.taskDescription}"</span
											>
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

										<div
											class="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400"
										>
											<span class="flex items-center gap-1">
												<span class="w-2 h-2 rounded-full bg-blue-400 dark:bg-blue-300"></span>
												<span>Confidence: {Math.round((submission.aiConfidence || 0) * 100)}%</span>
											</span>
											<span>{new Date(submission.submittedAt).toLocaleTimeString()}</span>
										</div>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{:else}
			<div class="transition-all duration-300">
				<Leaderboard {leaderboard} loading={leaderboardLoading} />
			</div>
		{/if}
	</div>
</div>
