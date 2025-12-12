<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Gift, ArrowLeft, CircleAlert, Loader, CheckCircle } from 'lucide-svelte';
	import { getUserContext } from '$lib/stores/user';
	import { debounce } from '$lib/utils/debounce';

	// Get user context from layout
	const userContext = getUserContext();

	let name = $state('');
	let password = $state('');
	let groupName = $state('');
	let loggingIn = $state(false);
	let errorMessage = $state('');
	let nameError = $state('');
	let groupError = $state('');
	let nameChecking = $state(false);
	let groupChecking = $state(false);
	let nameAvailable = $state<boolean | null>(null);
	let groupExists = $state<boolean | null>(null);

	$effect(() => {
		const lower = name.toLowerCase();
		if (name !== lower) {
			name = lower;
		}
	});

	const runNameCheck = debounce(async (currentName: string) => {
		try {
			const res = await fetch(`/api/check-username/${encodeURIComponent(currentName)}`);
			const data = await res.json().catch(() => ({}));
			if (!res.ok || data.available === false) {
				nameError =
					data.error || `"${currentName}" is already taken. Please choose a different username.`;
				nameAvailable = false;
			} else {
				nameAvailable = true;
			}
		} catch (error) {
			console.error('Name blur validation failed:', error);
		} finally {
			nameChecking = false;
		}
	}, 300);

	const runGroupCheck = debounce(async (currentGroup: string) => {
		try {
			const res = await fetch(`/api/check-group/${encodeURIComponent(currentGroup)}`);
			const data = await res.json().catch(() => ({}));
			if (!res.ok || data.exists === false) {
				groupError =
					data.error ||
					`No group found with the name "${currentGroup}". Please check with your organizer.`;
				groupExists = false;
			} else {
				groupExists = true;
			}
		} catch (error) {
			console.error('Group blur validation failed:', error);
		} finally {
			groupChecking = false;
		}
	}, 300);

	async function registerUser() {
		const trimmedName = name.trim().toLowerCase();
		const trimmedGroup = groupName.trim();

		if (!trimmedName) {
			nameError = 'Please enter a username';
			return;
		}
		if (!trimmedGroup) {
			groupError = 'Please enter your group name';
			return;
		}
		if (password.length < 9) {
			errorMessage = 'Password must be more than 8 characters';
			return;
		}

		loggingIn = true;
		errorMessage = '';

		try {
			// 1) Check username availability
			const nameRes = await fetch(`/api/check-username/${encodeURIComponent(trimmedName)}`);
			const nameData = await nameRes.json().catch(() => ({}));
			if (!nameRes.ok || nameData.available === false) {
				nameError =
					nameData.error ||
					`"${trimmedName}" is already taken. Please choose a different username.`;
				return;
			}
			nameAvailable = true;

			// 2) Check group existence
			const groupRes = await fetch(`/api/check-group/${encodeURIComponent(trimmedGroup)}`);
			const groupData = await groupRes.json().catch(() => ({}));
			if (!groupRes.ok || groupData.exists === false) {
				groupError =
					groupData.error ||
					`No group found with the name "${trimmedGroup}". Please check with your organizer.`;
				return;
			}
			groupExists = true;

			const groupId = groupData.id;
			if (!groupId) {
				errorMessage = 'Unable to resolve group. Please try again.';
				return;
			}

			// 3) Create the user account via auth API
			const response = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: trimmedName,
					password,
					isReturningUser: false
				})
			});

			if (!response.ok) {
				const error = await response.json().catch(() => ({}));
				if (response.status === 409) {
					errorMessage =
						error.message || 'This username is already taken. Please choose a different username.';
				} else if (response.status === 400) {
					errorMessage = error.error || 'Invalid registration details. Please check and try again.';
				} else {
					errorMessage = error.error || 'Registration failed. Please try again.';
				}
				return;
			}

			const data = await response.json();

			// Store user data and update context
			userContext.userId = data.userId;
			userContext.userName = data.userName;
			userContext.isAdmin = data.isAdmin ?? false;

			// 4) Join the resolved group
			try {
				const joinRes = await fetch(`/api/groups/${groupId}/join`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ userId: data.userId })
				});
				if (!joinRes.ok) {
					// Non-fatal; user can still join from tasks page
					console.error('Failed to join group during registration');
				} else {
					await userContext.refreshGroups();
					userContext.setActiveGroup(groupId);
				}
			} catch (e) {
				console.error('Error joining group during registration', e);
			}

			// Go to main tasks view
			goto(resolve('/tasks'));
		} catch (error) {
			console.error('Registration error:', error);
			errorMessage = 'Registration failed. Please try again.';
		} finally {
			loggingIn = false;
		}
	}

	async function validateNameOnBlur() {
		const trimmedName = name.trim().toLowerCase();
		nameError = '';
		nameAvailable = null;
		if (!trimmedName) {
			nameError = 'Please enter a username';
			return;
		}
		if (trimmedName.length < 2 || trimmedName.length > 30) {
			nameError = 'Username must be between 2 and 30 characters';
			return;
		}

		nameChecking = true;
		runNameCheck(trimmedName);
	}

	async function validateGroupOnBlur() {
		const trimmedGroup = groupName.trim();
		groupError = '';
		groupExists = null;
		if (!trimmedGroup) {
			groupError = 'Please enter your group name';
			return;
		}
		if (trimmedGroup.length < 2 || trimmedGroup.length > 64) {
			groupError = 'Group name must be between 2 and 64 characters';
			return;
		}

		groupChecking = true;
		runGroupCheck(trimmedGroup);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !loggingIn) {
			registerUser();
		}
	}
</script>

<svelte:head>
	<title>Register - Holiday Scavenger Hunt</title>
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
				<Gift class="w-10 h-10 text-green-600 dark:text-emerald-300" />
			</div>
			<h1 class="text-3xl font-bold text-gray-800 mb-2 dark:text-slate-100">Create your account</h1>
			<p class="text-gray-600 dark:text-slate-300">
				Choose a username (lowercase), join your group, and you're ready to start the hunt.
			</p>
		</div>

		<form
			onsubmit={(e) => {
				e.preventDefault();
				registerUser();
			}}
		>
			<div class="mb-5">
				<label for="name" class="block text-sm font-medium text-gray-700 mb-2 dark:text-slate-200">
					Username (lowercase)
				</label>
				<input
					id="name"
					type="text"
					bind:value={name}
					onkeydown={handleKeydown}
					onblur={validateNameOnBlur}
					autocapitalize="none"
					spellcheck="false"
					placeholder="choose a username (lowercase)"
					class="w-full px-4 py-3 border-2 rounded-xl focus:ring-0 transition-colors text-lg border-gray-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 {nameError
						? 'border-red-300 focus:border-red-500'
						: 'focus:border-green-500'}"
					maxlength="30"
					required
				/>
				{#if nameError}
					<p class="mt-2 text-sm text-red-600 dark:text-red-300 flex items-center gap-1">
						<CircleAlert class="w-4 h-4" />
						{nameError}
					</p>
				{:else if nameChecking}
					<p class="mt-2 text-sm text-blue-600 dark:text-blue-400 flex items-center gap-1">
						<Loader class="w-4 h-4 animate-spin" />
						Checking username availability...
					</p>
				{:else if nameAvailable}
					<p class="mt-2 text-sm text-green-600 dark:text-emerald-300 flex items-center gap-1">
						<CheckCircle class="w-4 h-4" />
						Username is available!
					</p>
				{/if}
			</div>

			<div class="mb-5">
				<label for="group" class="block text-sm font-medium text-gray-700 mb-2 dark:text-slate-200">
					Group name
				</label>
				<input
					id="group"
					type="text"
					bind:value={groupName}
					onkeydown={handleKeydown}
					onblur={validateGroupOnBlur}
					placeholder="Exact name of your group"
					class="w-full px-4 py-3 border-2 rounded-xl focus:ring-0 transition-colors text-lg border-gray-200 {groupError
						? 'border-red-300 focus:border-red-500'
						: 'focus:border-green-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100'}"
					required
				/>
				<p class="mt-1 text-xs text-gray-500 dark:text-slate-400">
					Ask your organizer for the exact group name. We'll verify it exists before creating your
					account.
				</p>
				{#if groupError}
					<p class="mt-2 text-sm text-red-600 flex items-center gap-1">
						<CircleAlert class="w-4 h-4" />
						{groupError}
					</p>
				{:else if groupChecking}
					<p class="mt-2 text-sm text-blue-600 flex items-center gap-1">
						<Loader class="w-4 h-4 animate-spin" />
						Checking group name...
					</p>
				{:else if groupExists}
					<p class="mt-2 text-sm text-green-600 flex items-center gap-1">
						<CheckCircle class="w-4 h-4" />
						Group found!
					</p>
				{/if}
			</div>

			<div class="mb-6">
				<label
					for="password"
					class="block text-sm font-medium text-gray-700 mb-2 dark:text-slate-200"
				>
					Password (more than 8 characters)
				</label>
				<input
					id="password"
					type="password"
					bind:value={password}
					onkeydown={handleKeydown}
					placeholder="Create a password"
					class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-0 transition-colors text-lg dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
					required
				/>
			</div>

			{#if errorMessage}
				<div
					class="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg dark:bg-red-950/40 dark:border-red-700"
				>
					<p class="text-red-600 text-sm flex items-center gap-2 dark:text-red-300">
						<CircleAlert class="w-4 h-4" />
						{errorMessage}
					</p>
				</div>
			{/if}

			<button
				type="submit"
				disabled={loggingIn || !name.trim() || !groupName.trim() || password.length < 9}
				class="w-full py-3 px-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
			>
				{#if loggingIn}
					<div
						class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"
					></div>
					Creating account...
				{:else}
					<Gift class="w-4 h-4" />
					Join the Hunt
				{/if}
			</button>
		</form>

		<div class="mt-6 text-center text-sm text-gray-600 dark:text-slate-300">
			<p>
				Already have an account?
				<a href={resolve('/login')} class="font-semibold text-green-700 hover:text-green-900 ml-1">
					Log in
				</a>
			</p>
			<p class="mt-3">
				<a
					href={resolve('/')}
					class="inline-flex items-center gap-1 text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
				>
					<ArrowLeft class="w-4 h-4" />
					Back to landing page
				</a>
			</p>
		</div>
	</div>
</div>
