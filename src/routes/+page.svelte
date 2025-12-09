<script lang="ts">
	import { goto } from '$app/navigation';
	import { getUserContext } from '$lib/stores/user';

	const userContext = getUserContext();
	let userId = $derived(userContext.userId);
	let userName = $derived(userContext.userName);

	function handleGetStarted() {
		goto('/login');
	}

	function handleViewTasks() {
		goto('/tasks');
	}

	function handleRegister() {
		goto('/register');
	}
</script>

<div
	class="min-h-screen bg-gradient-to-br from-green-50 via-white to-red-50 flex items-center justify-center p-4"
>
	<div class="w-full max-w-4xl mx-auto grid gap-8 md:grid-cols-[3fr,2fr] items-center">
		<div>
			<p class="text-sm font-semibold text-green-700 mb-2 tracking-wide">
				2025 Holiday Photo Scavenger Hunt
			</p>
			<h1 class="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4 leading-tight">
				Find the magic.
				<span class="text-green-600"> Capture the moment.</span>
			</h1>
			<p class="text-gray-600 text-base md:text-lg mb-6 max-w-xl">
				Join your friends or team for a festive, photo-based scavenger hunt. Unlock daily
				challenges, earn points, and compete on your group's leaderboard.
			</p>

			<div class="flex flex-wrap gap-3 mb-6">
				{#if userId}
					<button
						type="button"
						onclick={handleViewTasks}
						class="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-green-600 text-white font-semibold shadow-md hover:bg-green-700 transition-colors"
					>
						Go to your tasks
					</button>
				{:else}
					<button
						type="button"
						onclick={handleGetStarted}
						class="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-green-600 text-white font-semibold shadow-md hover:bg-green-700 transition-colors"
					>
						Login to continue
					</button>
					<button
						type="button"
						onclick={handleRegister}
						class="inline-flex items-center justify-center px-6 py-3 rounded-xl border-2 border-green-600 text-green-700 font-semibold rounded-xl hover:bg-green-50 transition-colors"
					>
						Create a new account
					</button>
				{/if}
			</div>

			<ul class="space-y-2 text-sm text-gray-600">
				<li>
					<span class="font-semibold text-gray-800">• Daily prompts</span> – new festive tasks unlock
					over time.
				</li>
				<li>
					<span class="font-semibold text-gray-800">• Group-based play</span> – every submission scores
					points for your group.
				</li>
				<li>
					<span class="font-semibold text-gray-800">• Photo-first</span> – upload or select from your
					library, then let the AI validate your find.
				</li>
			</ul>
		</div>

		<div class="bg-white/80 backdrop-blur rounded-2xl shadow-xl p-6 md:p-8 border border-green-100">
			<div class="flex items-center gap-3 mb-4">
				<div class="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-2xl">
					🎄
				</div>
				<div>
					<p class="text-xs uppercase tracking-wide text-green-700 font-semibold">How it works</p>
					<p class="text-sm text-gray-600">3 simple steps to join the hunt</p>
				</div>
			</div>

			<ol class="space-y-4 text-sm text-gray-700">
				<li class="flex gap-3">
					<span
						class="flex h-6 w-6 items-center justify-center rounded-full bg-green-600 text-white text-xs font-bold mt-0.5"
					>
						1
					</span>
					<div>
						<p class="font-semibold text-gray-900">Sign in or register</p>
						<p class="text-gray-600">
							Use your display name and a password to create your player profile.
						</p>
					</div>
				</li>
				<li class="flex gap-3">
					<span
						class="flex h-6 w-6 items-center justify-center rounded-full bg-green-600 text-white text-xs font-bold mt-0.5"
					>
						2
					</span>
					<div>
						<p class="font-semibold text-gray-900">Join your group</p>
						<p class="text-gray-600">
							Enter the name of your existing group so you appear on the right leaderboard.
						</p>
					</div>
				</li>
				<li class="flex gap-3">
					<span
						class="flex h-6 w-6 items-center justify-center rounded-full bg-green-600 text-white text-xs font-bold mt-0.5"
					>
						3
					</span>
					<div>
						<p class="font-semibold text-gray-900">Start completing tasks</p>
						<p class="text-gray-600">
							Browse your task list, submit photos, and climb the leaderboard.
						</p>
					</div>
				</li>
			</ol>

			{#if userId}
				<div
					class="mt-6 rounded-xl bg-green-50 border border-green-100 px-4 py-3 text-xs text-green-800"
				>
					<span class="font-semibold">Signed in as {userName ?? 'player'}.</span>
					<button
						type="button"
						onclick={handleViewTasks}
						class="ml-2 underline font-medium hover:text-green-900"
					>
						Go to tasks
					</button>
				</div>
			{:else}
				<div class="mt-6 text-xs text-gray-500">
					Already have an account?
					<button
						type="button"
						onclick={handleGetStarted}
						class="ml-1 underline font-medium text-green-700 hover:text-green-900"
					>
						Log in
					</button>
				</div>
			{/if}
		</div>
	</div>
</div>
