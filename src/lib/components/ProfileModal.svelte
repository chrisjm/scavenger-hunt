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

	// Reset form when modal opens
	$effect(() => {
		if (show) {
			newName = currentName;
			nameError = '';
		}
	});

	function validateName(name: string): boolean {
		if (!name.trim()) {
			nameError = 'Name cannot be empty';
			return false;
		}
		if (name.trim().length < 2) {
			nameError = 'Name must be at least 2 characters';
			return false;
		}
		if (name.trim().length > 30) {
			nameError = 'Name must be less than 30 characters';
			return false;
		}
		nameError = '';
		return true;
	}

	async function handleSave() {
		if (!validateName(newName)) return;

		try {
			await onSave(newName.trim());
			onClose();
		} catch (error) {
			nameError = 'Failed to update name. Please try again.';
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
		class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
		onclick={handleBackdropClick}
		onkeydown={(e) => e.key === 'Escape' && onClose()}
		role="dialog"
		aria-modal="true"
		aria-labelledby="profile-title"
		tabindex="-1"
	>
		<!-- Modal Content -->
		<div
			class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 md:p-8 transform transition-all"
			role="document"
		>
			<!-- Header -->
			<div class="flex items-center gap-3 mb-6">
				<div
					class="w-12 h-12 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center"
				>
					<span class="text-2xl">👤</span>
				</div>
				<div class="flex-1">
					<h2 id="profile-title" class="text-xl font-bold text-gray-800">Profile Settings</h2>
					<p class="text-sm text-gray-600">Update your display name</p>
				</div>
				<button
					onclick={onClose}
					class="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
					aria-label="Close modal"
				>
					<span class="text-gray-400 text-xl">×</span>
				</button>
			</div>

			<!-- Profile Preview (Future Avatar Support) -->
			<div class="flex items-center gap-4 p-4 bg-gray-50 rounded-xl mb-6">
				<div
					class="w-16 h-16 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xl"
				>
					{newName.trim() ? newName.trim().charAt(0).toUpperCase() : '?'}
				</div>
				<div class="flex-1">
					<p class="font-medium text-gray-800">{newName.trim() || 'Your Name'}</p>
					<p class="text-sm text-gray-500">Christmas Scavenger Hunter</p>
					<!-- Future: Avatar upload button will go here -->
				</div>
			</div>

			<!-- Name Input -->
			<div class="mb-6">
				<label for="profile-name" class="block text-sm font-medium text-gray-700 mb-2">
					Display Name
				</label>
				<input
					id="profile-name"
					type="text"
					bind:value={newName}
					onkeydown={handleKeydown}
					oninput={() => validateName(newName)}
					placeholder="Enter your name"
					class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-0 transition-colors text-lg"
					class:border-red-300={nameError}
					class:focus:border-red-500={nameError}
					disabled={saving}
					maxlength="30"
				/>
				{#if nameError}
					<p class="mt-2 text-sm text-red-600 flex items-center gap-1">
						<span>⚠️</span>
						{nameError}
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
					class="flex-1 px-6 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
				>
					Cancel
				</button>
				<button
					onclick={handleSave}
					disabled={saving || !newName.trim() || !!nameError}
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
