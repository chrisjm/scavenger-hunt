<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { getUserContext } from '$lib/stores/user';

	// Get user context from layout
	const userContext = getUserContext();
	let userId = $derived(userContext.userId);
	let userName = $derived(userContext.userName);
	let newName = $state('');
	let nameError = $state('');
	let savingProfile = $state(false);
	let checkingAvailability = $state(false);
	let nameAvailable = $state<boolean | null>(null);
	let checkTimeout: ReturnType<typeof setTimeout> | null = null;

	// Load user data when component mounts
	onMount(() => {
		if (userId) {
			loadUserData();
		}
	});

	// Watch for userId changes and load data
	$effect(() => {
		if (userId) {
			loadUserData();
		}
	});

	async function loadUserData() {
		try {
			const response = await fetch(`/api/users/${userId}`);
			if (response.ok) {
				const data = await response.json();
				// Update context with fresh user name
				userContext.userName = data.user.name;
			}
		} catch (error) {
			console.error('Failed to load user data:', error);
		}
	}

	function validateName(name: string): boolean {
		if (!name.trim()) {
			nameError = 'Name cannot be empty';
			nameAvailable = null;
			return false;
		}
		if (name.trim().length < 2) {
			nameError = 'Name must be at least 2 characters';
			nameAvailable = null;
			return false;
		}
		if (name.trim().length > 30) {
			nameError = 'Name must be less than 30 characters';
			nameAvailable = null;
			return false;
		}
		nameError = '';
		return true;
	}

	async function checkNameAvailability(name: string) {
		const trimmedName = name.trim();

		// Don't check if it's the same as current name
		if (trimmedName === userName) {
			nameAvailable = true;
			return;
		}

		if (!validateName(trimmedName)) {
			return;
		}

		try {
			checkingAvailability = true;
			const response = await fetch(`/api/check-name/${encodeURIComponent(trimmedName)}`);
			const data = await response.json();

			if (response.ok) {
				nameAvailable = data.available;
				if (!data.available) {
					nameError = `"${trimmedName}" is already taken. Please choose a different name.`;
				}
			} else {
				nameError = data.error || 'Failed to check name availability';
				nameAvailable = null;
			}
		} catch (error) {
			console.error('Name availability check failed:', error);
			nameAvailable = null;
		} finally {
			checkingAvailability = false;
		}
	}

	function handleNameInput(name: string) {
		newName = name;

		// Clear previous timeout
		if (checkTimeout) {
			clearTimeout(checkTimeout);
		}

		// Reset availability state
		nameAvailable = null;

		// Validate immediately
		if (!validateName(name)) {
			return;
		}

		// Debounce the availability check
		checkTimeout = setTimeout(() => {
			checkNameAvailability(name);
		}, 500);
	}

	async function updateProfile() {
		if (!validateName(newName) || !userId) return;

		// If name is different from current, ensure it's available
		if (newName.trim() !== userName) {
			if (!nameAvailable) {
				// Check availability one more time before saving
				await checkNameAvailability(newName);
				if (!nameAvailable) {
					return;
				}
			}
		}

		try {
			savingProfile = true;
			const response = await fetch(`/api/users/${userId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: newName.trim() })
			});

			if (response.ok) {
				const data = await response.json();
				// Update context with new user name
				userContext.userName = data.user.name;

				// Show success message
				nameError = '';
				// Could add a success toast here
			} else {
				const error = await response.json();
				if (response.status === 409) {
					nameError =
						error.message || 'This name is already taken. Please choose a different name.';
				} else {
					nameError = 'Failed to update profile. Please try again.';
				}
			}
		} catch (error) {
			console.error('Failed to update profile:', error);
			nameError = 'Failed to update profile. Please try again.';
		} finally {
			savingProfile = false;
		}
	}

	function logout() {
		// Clear localStorage
		localStorage.removeItem('scavenger-hunt-userId');

		// Redirect to login
		goto('/login');
	}
</script>

<svelte:head>
	<title>Profile - Christmas Scavenger Hunt</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-green-50 to-red-50 p-4">
	<div class="container mx-auto max-w-2xl">
		<!-- Header -->
		<div class="bg-white rounded-2xl shadow-xl p-6 md:p-8 mb-6">
			<div class="flex items-center justify-between mb-6">
				<div class="flex items-center gap-4">
					<div
						class="w-16 h-16 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white text-2xl font-bold"
					>
						{userName ? userName.charAt(0).toUpperCase() : '?'}
					</div>
					<div>
						<h1 class="text-2xl font-bold text-gray-800">Profile Settings</h1>
						<p class="text-gray-600">Manage your scavenger hunt profile</p>
					</div>
				</div>
				<a
					href="/"
					class="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium"
				>
					← Back to Hunt
				</a>
			</div>

			<!-- Profile Preview -->
			<div class="flex items-center gap-4 p-4 bg-gray-50 rounded-xl mb-6">
				<div
					class="w-20 h-20 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-2xl"
				>
					{newName.trim() ? newName.trim().charAt(0).toUpperCase() : '?'}
				</div>
				<div class="flex-1">
					<p class="font-medium text-gray-800 text-lg">{newName.trim() || 'Your Name'}</p>
					<p class="text-sm text-gray-500">Christmas Scavenger Hunter</p>
					<!-- Future: Avatar upload section will go here -->
				</div>
			</div>

			<!-- Name Input -->
			<div class="mb-6">
				<label for="profile-name" class="block text-sm font-medium text-gray-700 mb-2">
					Display Name
				</label>
				<div class="relative">
					<input
						id="profile-name"
						type="text"
						bind:value={newName}
						oninput={(e) => handleNameInput(e.currentTarget.value)}
						placeholder="Choose a unique name"
						class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-0 transition-colors text-lg pr-10"
						class:border-red-300={nameError}
						class:focus:border-red-500={nameError}
						class:border-green-300={nameAvailable === true && newName.trim() !== userName}
						class:focus:border-green-500={nameAvailable === true && newName.trim() !== userName}
						disabled={savingProfile}
						maxlength="30"
					/>

					<!-- Status indicator -->
					<div class="absolute right-3 top-1/2 transform -translate-y-1/2">
						{#if checkingAvailability}
							<div
								class="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"
							></div>
						{:else if nameAvailable === true && newName.trim() !== userName}
							<span class="text-green-500 text-lg">✓</span>
						{:else if nameAvailable === false}
							<span class="text-red-500 text-lg">✗</span>
						{/if}
					</div>
				</div>

				{#if nameError}
					<p class="mt-2 text-sm text-red-600 flex items-center gap-1">
						<span>⚠️</span>
						{nameError}
					</p>
				{:else if checkingAvailability}
					<p class="mt-2 text-sm text-blue-600 flex items-center gap-1">
						<span>🔍</span>
						Checking availability...
					</p>
				{:else if nameAvailable === true && newName.trim() !== userName}
					<p class="mt-2 text-sm text-green-600 flex items-center gap-1">
						<span>✅</span>
						Name is available!
					</p>
				{/if}
			</div>

			<!-- Action Buttons -->
			<div class="flex gap-3">
				<button
					onclick={updateProfile}
					disabled={savingProfile ||
						!newName.trim() ||
						!!nameError ||
						(newName.trim() !== userName && !nameAvailable)}
					class="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
				>
					{#if savingProfile}
						<div
							class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
						></div>
						Saving...
					{:else}
						💾 Save Changes
					{/if}
				</button>
			</div>
		</div>

		<!-- Account Actions -->
		<div class="bg-white rounded-2xl shadow-xl p-6 md:p-8">
			<h2 class="text-xl font-bold text-gray-800 mb-4">Account Actions</h2>

			<div class="space-y-4">
				<!-- Future: Additional profile settings will go here -->
				<div class="p-4 border-2 border-dashed border-gray-200 rounded-xl text-center">
					<p class="text-gray-400 text-sm">🎨 Avatar Upload</p>
					<p class="text-gray-400 text-xs">Coming Soon!</p>
				</div>

				<!-- Logout -->
				<button
					onclick={logout}
					class="w-full px-4 py-3 border-2 border-red-200 text-red-600 rounded-xl font-medium hover:bg-red-50 transition-colors"
				>
					🚪 Logout
				</button>
			</div>
		</div>
	</div>
</div>
