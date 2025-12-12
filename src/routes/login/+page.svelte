<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { getUserContext } from '$lib/stores/user';

	// Get user context from layout
	const userContext = getUserContext();

	let username = $state('');
	let loggingIn = $state(false);
	const isReturningUser = true;
	let errorMessage = $state('');
	let password = $state('');

	async function loginUser() {
		const trimmedName = username.trim();

		if (!trimmedName) {
			errorMessage = 'Please enter your name';
			return;
		}

		if (password.length < 9) {
			errorMessage = 'Password must be more than 8 characters';
			return;
		}

		errorMessage = '';
		loggingIn = true;

		try {
			const response = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: trimmedName,
					password,
					isReturningUser
				})
			});

			if (response.ok) {
				const data = await response.json();

				// Store user data and update context
				userContext.userId = data.userId;
				userContext.userName = data.userName;
				userContext.isAdmin = data.isAdmin ?? false;

				// Redirect to tasks/dashboard
				goto('/tasks');
			} else {
				const error = await response.json();
				if (response.status === 409) {
					errorMessage =
						error.message || 'This name is already taken. Please choose a different name.';
				} else if (response.status === 404) {
					errorMessage =
						error.message || 'User not found. Please check your username or create a new account.';
				} else if (response.status === 400) {
					errorMessage = error.error || 'Invalid login details. Please check and try again.';
				} else {
					errorMessage = 'Login failed: ' + error.error;
				}
			}
		} catch (error) {
			console.error('Login error:', error);
			errorMessage = 'Login failed. Please try again.';
		} finally {
			loggingIn = false;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !loggingIn) {
			loginUser();
		}
	}
</script>

<svelte:head>
	<title>Login - Holiday Scavenger Hunt</title>
</svelte:head>

<div
	class="min-h-screen bg-gradient-to-br from-green-50 to-red-50 dark:from-slate-950 dark:to-slate-950 flex items-center justify-center p-4"
>
	<div class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 md:p-8 dark:bg-slate-900">
		<!-- Header -->
		<div class="text-center mb-8">
			<div
				class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 dark:bg-emerald-900/40"
			>
				<span class="text-green-600 text-4xl dark:text-emerald-300">🎄</span>
			</div>
			<h1 class="text-3xl font-bold text-gray-800 mb-2 dark:text-slate-100">Welcome back</h1>
			<p class="text-gray-600 dark:text-slate-300">
				Sign in with your scavenger hunt username and password to continue playing.
			</p>
		</div>

		<!-- Login Form -->
		<form
			onsubmit={(e) => {
				e.preventDefault();
				loginUser();
			}}
		>
			<div class="mb-6">
				<label for="name" class="block text-sm font-medium text-gray-700 mb-2 dark:text-slate-200">
					Username
				</label>
				<input
					id="name"
					type="text"
					bind:value={username}
					onkeydown={handleKeydown}
					placeholder="Enter your username"
					class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-0 transition-colors text-lg dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
					class:border-red-300={errorMessage}
					class:focus:border-red-500={errorMessage}
					disabled={loggingIn}
					maxlength="30"
					required
				/>
			</div>

			<div class="mb-6">
				<label
					for="password"
					class="block text-sm font-medium text-gray-700 mb-2 dark:text-slate-200"
				>
					Password
				</label>
				<input
					id="password"
					type="password"
					bind:value={password}
					onkeydown={handleKeydown}
					placeholder="Enter your password"
					class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-0 transition-colors text-lg"
					class:border-red-300={errorMessage}
					class:focus:border-red-500={errorMessage}
					disabled={loggingIn}
					required
				/>
			</div>

			{#if errorMessage}
				<div
					class="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg dark:bg-red-950/40 dark:border-red-700"
				>
					<p class="text-red-600 text-sm flex items-center gap-2 dark:text-red-300">
						<span>⚠️</span>
						{errorMessage}
					</p>
				</div>
			{/if}

			<button
				type="submit"
				disabled={loggingIn || !username.trim() || password.length < 9}
				class="w-full py-3 px-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
			>
				{#if loggingIn}
					<div
						class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"
					></div>
					Logging in...
				{:else}
					🔑 Log In
				{/if}
			</button>
		</form>

		<!-- Back to Home -->
		<div class="mt-6 text-center text-sm text-gray-600 dark:text-slate-300">
			<p>
				New to the hunt?
				<a href="/register" class="font-semibold text-green-700 hover:text-green-900 ml-1">
					Create an account
				</a>
			</p>
			<p class="mt-3">
				<a
					href="/"
					class="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
				>
					← Back to landing page
				</a>
			</p>
		</div>
	</div>
</div>
