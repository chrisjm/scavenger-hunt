<script lang="ts">
	interface Props {
		show: boolean;
		currentName: string;
		saving: boolean;
		onSave: (newName: string) => Promise<void>;
		onClose: () => void;
	}

	let { show, currentName, saving, onSave, onClose }: Props = $props();

	let newName = $state('');
	let nameError = $state('');
	let checkingAvailability = $state(false);
	let nameAvailable = $state<boolean | null>(null);
	let checkTimeout: ReturnType<typeof setTimeout> | null = null;

	// Reset form when modal opens
	$effect(() => {
		if (show) {
			newName = currentName;
			nameError = '';
			nameAvailable = null;
			checkingAvailability = false;
			if (checkTimeout) {
				clearTimeout(checkTimeout);
				checkTimeout = null;
			}
		}
	});

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
		if (trimmedName === currentName) {
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

	async function handleSave() {
		if (!validateName(newName)) return;

		// If name is different from current, ensure it's available
		if (newName.trim() !== currentName) {
			if (!nameAvailable) {
				// Check availability one more time before saving
				await checkNameAvailability(newName);
				if (!nameAvailable) {
					return;
				}
			}
		}

		try {
			await onSave(newName.trim());
			onClose();
		} catch (error) {
			if (error instanceof Error && error.message.includes('already taken')) {
				nameError = error.message;
			} else {
				nameError = 'Failed to update name. Please try again.';
			}
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !saving) {
			handleSave();
		} else if (event.key === 'Escape') {
			onClose();
		}
	}

	function handleBackdropClick(event: MouseEvent) {
		// Only close if clicking the backdrop, not the modal content
		if (event.target === event.currentTarget) {
			onClose();
		}
	}
</script>

{#if show}
	<!-- Modal Backdrop -->
	<div
		class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 dark:bg-black/80"
		onclick={handleBackdropClick}
		onkeydown={(e) => e.key === 'Escape' && onClose()}
		role="dialog"
		aria-modal="true"
		aria-labelledby="profile-title"
		tabindex="-1"
	>
		<!-- Modal Content -->
		<div
			class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 md:p-8 transform transition-all dark:bg-slate-900"
			role="document"
		>
			<!-- Header -->
			<div class="flex items-center gap-3 mb-6">
				<div
					class="w-12 h-12 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center dark:from-blue-900 dark:to-purple-900"
				>
					<span class="text-2xl">👤</span>
				</div>
				<div class="flex-1">
					<h2 id="profile-title" class="text-xl font-bold text-gray-800 dark:text-slate-100">
						Profile Settings
					</h2>
					<p class="text-sm text-gray-600 dark:text-slate-400">Update your display name</p>
				</div>
				<button
					onclick={onClose}
					class="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors dark:hover:bg-slate-800"
					aria-label="Close modal"
				>
					<span class="text-gray-400 text-xl">×</span>
				</button>
			</div>

			<!-- Profile Preview (Future Avatar Support) -->
			<div class="flex items-center gap-4 p-4 bg-gray-50 rounded-xl mb-6 dark:bg-slate-900">
				<div
					class="w-16 h-16 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xl"
				>
					{newName.trim() ? newName.trim().charAt(0).toUpperCase() : '?'}
				</div>
				<div class="flex-1">
					<p class="font-medium text-gray-800 dark:text-slate-100">
						{newName.trim() || 'Your Name'}
					</p>
					<p class="text-sm text-gray-500 dark:text-slate-400">Holiday Scavenger Hunter</p>
					<!-- Future: Avatar upload button will go here -->
				</div>
			</div>

			<!-- Name Input -->
			<div class="mb-6">
				<label
					for="profile-name"
					class="block text-sm font-medium text-gray-700 mb-2 dark:text-slate-200"
				>
					Display Name
				</label>
				<div class="relative">
					<input
						id="profile-name"
						type="text"
						bind:value={newName}
						onkeydown={handleKeydown}
						oninput={(e) => handleNameInput(e.currentTarget.value)}
						placeholder="Choose a unique name"
						class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-0 transition-colors text-lg pr-10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
						class:border-red-300={nameError}
						class:focus:border-red-500={nameError}
						class:border-green-300={nameAvailable === true && newName.trim() !== currentName}
						class:focus:border-green-500={nameAvailable === true && newName.trim() !== currentName}
						disabled={saving}
						maxlength="30"
					/>

					<!-- Status indicator -->
					<div class="absolute right-3 top-1/2 transform -translate-y-1/2">
						{#if checkingAvailability}
							<div
								class="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"
							></div>
						{:else if nameAvailable === true && newName.trim() !== currentName}
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
				{:else if nameAvailable === true && newName.trim() !== currentName}
					<p class="mt-2 text-sm text-green-600 flex items-center gap-1">
						<span>✅</span>
						Name is available!
					</p>
				{/if}
			</div>

			<!-- Future Profile Fields -->
			<!--
			<div class="mb-6 p-4 border-2 border-dashed border-gray-200 rounded-xl text-center">
				<p class="text-gray-400 text-sm">🎨 Avatar Upload</p>
				<p class="text-gray-400 text-xs">Coming Soon!</p>
			</div>
			-->

			<!-- Action Buttons -->
			<div class="flex gap-3">
				<button
					onclick={onClose}
					disabled={saving}
					class="flex-1 px-6 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
				>
					Cancel
				</button>
				<button
					onclick={handleSave}
					disabled={saving ||
						!newName.trim() ||
						!!nameError ||
						(newName.trim() !== currentName && !nameAvailable)}
					class="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
				>
					{#if saving}
						<div
							class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
						></div>
						Saving...
					{:else}
						Save Changes
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}
