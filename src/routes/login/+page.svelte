<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	let loginName = $state('');
	let loggingIn = $state(false);
	let isReturningUser = $state(false);
	let errorMessage = $state('');

	// Check if user is already logged in
	onMount(() => {
		const storedUserId = localStorage.getItem('scavenger-hunt-userId');
		const storedUserName = localStorage.getItem('scavenger-hunt-userName');

		if (storedUserId && storedUserName) {
			// User is already logged in, redirect to main page
			goto('/');
		}
	});

	async function loginUser() {
		if (!loginName.trim()) {
			errorMessage = 'Please enter your name';
			return;
		}

		errorMessage = '';
		loggingIn = true;

		try {
			const response = await fetch('/api/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: loginName.trim(),
					isReturningUser
				})
			});

			if (response.ok) {
				const data = await response.json();

				// Store user data (temporary until we implement proper session management)
				localStorage.setItem('scavenger-hunt-userId', data.userId);
				localStorage.setItem('scavenger-hunt-userName', data.userName);

				// Redirect to main page
				goto('/');
			} else {
				const error = await response.json();
				if (response.status === 409) {
					errorMessage =
						error.message || 'This name is already taken. Please choose a different name.';
				} else if (response.status === 404) {
					errorMessage =
						error.message || 'User not found. Please check your username or create a new account.';
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
	<title>Login - Christmas Scavenger Hunt</title>
</svelte:head>

<div
	class="min-h-screen bg-gradient-to-br from-green-50 to-red-50 flex items-center justify-center p-4"
>
	<div class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 md:p-8">
		<!-- Header -->
		<div class="text-center mb-8">
			<div
				class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
			>
				<span class="text-green-600 text-4xl">🎄</span>
			</div>
			<h1 class="text-3xl font-bold text-gray-800 mb-2">
				{isReturningUser ? 'Welcome Back!' : 'Join the Hunt!'}
			</h1>
			<p class="text-gray-600">
				{isReturningUser
					? 'Enter your username to continue your scavenger hunt'
					: 'Choose a unique name to join the Christmas Scavenger Hunt'}
			</p>
		</div>

		<!-- User Type Toggle -->
		<div class="mb-6">
			<div class="flex bg-gray-100 rounded-lg p-1">
				<button
					type="button"
					onclick={() => {
						isReturningUser = false;
						errorMessage = '';
					}}
					class="flex-1 py-3 px-4 rounded-md text-sm font-medium transition-all duration-200 {!isReturningUser
						? 'bg-white text-green-600 shadow-sm'
						: 'text-gray-600 hover:text-gray-800'}"
				>
					🆕 New User
				</button>
				<button
					type="button"
					onclick={() => {
						isReturningUser = true;
						errorMessage = '';
					}}
					class="flex-1 py-3 px-4 rounded-md text-sm font-medium transition-all duration-200 {isReturningUser
						? 'bg-white text-green-600 shadow-sm'
						: 'text-gray-600 hover:text-gray-800'}"
				>
					🔄 Returning User
				</button>
			</div>
		</div>

		<!-- Login Form -->
		<form
			onsubmit={(e) => {
				e.preventDefault();
				loginUser();
			}}
		>
			<div class="mb-6">
				<label for="name" class="block text-sm font-medium text-gray-700 mb-2"> Your Name </label>
				<input
					id="name"
					type="text"
					bind:value={loginName}
					onkeydown={handleKeydown}
					placeholder={isReturningUser ? 'Enter your username' : 'Choose a unique name'}
					class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-0 transition-colors text-lg"
					class:border-red-300={errorMessage}
					class:focus:border-red-500={errorMessage}
					disabled={loggingIn}
					maxlength="30"
					required
				/>
			</div>

			{#if errorMessage}
				<div class="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
					<p class="text-red-600 text-sm flex items-center gap-2">
						<span>⚠️</span>
						{errorMessage}
					</p>
				</div>
			{/if}

			<button
				type="submit"
				disabled={loggingIn || !loginName.trim()}
				class="w-full py-3 px-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
			>
				{#if loggingIn}
					<div
						class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"
					></div>
					{isReturningUser ? 'Logging in...' : 'Creating account...'}
				{:else}
					{isReturningUser ? '🔑 Log In' : '🎯 Join Hunt'}
				{/if}
			</button>
		</form>

		<!-- Back to Home -->
		<div class="mt-6 text-center">
			<a href="/" class="text-gray-500 hover:text-gray-700 text-sm transition-colors">
				← Back to Home
			</a>
		</div>
	</div>
</div>
