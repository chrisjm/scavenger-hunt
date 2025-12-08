<script lang="ts">
	import { Camera, Image as ImageIcon, Loader, Upload } from 'lucide-svelte';
	import PhotoSelector from './PhotoSelector.svelte';

	interface Props {
		show: boolean;
		task: any;
		userId: string;
		onClose: () => void;
		onSuccess: (result: any) => void;
	}

	let { show, task, userId, onClose, onSuccess }: Props = $props();

	let activeTab = $state<'upload' | 'library'>('upload');
	let selectedPhotoId = $state<string | null>(null);
	let uploading = $state(false);
	let submitting = $state(false);

	// Temporary file for preview before upload
	let tempFile = $state<File | null>(null);
	let tempPreview = $state<string | null>(null);

	function reset() {
		activeTab = 'upload';
		selectedPhotoId = null;
		tempFile = null;
		tempPreview = null;
	}

	// Handle file selection from input
	async function handleFileSelect(e: Event) {
		const target = e.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) {
			return;
		}

		tempFile = file;
		tempPreview = URL.createObjectURL(file);
		selectedPhotoId = null; // Clear library selection
	}

	// Function to trigger camera input
	function triggerCamera() {
		const input = document.getElementById('camera-input') as HTMLInputElement;
		if (input) {
			input.click();
		} else {
			console.error('Camera input not found');
		}
	}

	// Function to trigger gallery input
	function triggerGallery() {
		const input = document.getElementById('gallery-input') as HTMLInputElement;
		if (input) {
			input.click();
		} else {
			console.error('Gallery input not found');
		}
	}

	// Handle library selection
	function handleLibrarySelect(photo: any) {
		selectedPhotoId = photo.id;
		tempFile = null; // Clear file upload
		tempPreview = null;
	}

	async function handleSubmit() {
		if (!userId || !task) return;

		try {
			submitting = true;
			let finalPhotoId = selectedPhotoId;

			// Step 1: If we have a raw file, upload to library first
			if (tempFile) {
				uploading = true;
				const formData = new FormData();
				formData.append('image', tempFile);
				formData.append('userId', userId);

				const uploadRes = await fetch('/api/library/upload', {
					method: 'POST',
					body: formData
				});

				if (!uploadRes.ok) throw new Error('Failed to upload image');

				const uploadData = await uploadRes.json();
				finalPhotoId = uploadData.photo.id;
				uploading = false;
			}

			if (!finalPhotoId) throw new Error('No photo selected');

			// Step 2: Submit to Task
			const submitRes = await fetch('/api/submissions', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					userId,
					taskId: task.id,
					photoId: finalPhotoId
				})
			});

			const result = await submitRes.json();
			if (!submitRes.ok) throw new Error(result.error || 'Submission failed');

			onSuccess(result);
			reset();
		} catch (error) {
			console.error(error);
			alert(error instanceof Error ? error.message : 'Something went wrong');
		} finally {
			submitting = false;
			uploading = false;
		}
	}
</script>

{#if show && task}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
		<div class="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
			<div class="bg-gradient-to-r from-green-600 to-emerald-600 p-4 text-white">
				<h3 class="text-lg font-bold">Submit Entry</h3>
				<p class="opacity-90 text-sm">Task: {task.description}</p>
			</div>

			<div class="flex border-b border-gray-100">
				<button
					class="flex-1 py-3 text-sm font-medium transition-colors {activeTab === 'upload'
						? 'border-b-2 border-green-500 text-green-600 bg-green-50/50'
						: 'text-gray-500 hover:bg-gray-50'}"
					onclick={() => (activeTab = 'upload')}
				>
					<span class="flex items-center justify-center gap-2">
						<Camera class="h-4 w-4" /> Camera & Gallery
					</span>
				</button>
				<button
					class="flex-1 py-3 text-sm font-medium transition-colors {activeTab === 'library'
						? 'border-b-2 border-green-500 text-green-600 bg-green-50/50'
						: 'text-gray-500 hover:bg-gray-50'}"
					onclick={() => (activeTab = 'library')}
				>
					<span class="flex items-center justify-center gap-2">
						<ImageIcon class="h-4 w-4" /> From Library
					</span>
				</button>
			</div>

			<div class="p-6">
				{#if activeTab === 'upload'}
					<div class="space-y-4">
						<div
							class="relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-6 transition-colors hover:border-green-400 hover:bg-green-50"
						>
							{#if tempPreview}
								<img
									src={tempPreview}
									alt="Preview"
									class="max-h-48 rounded-lg object-contain shadow-sm"
								/>
								<button
									onclick={() => {
										tempFile = null;
										tempPreview = null;
									}}
									class="mt-2 text-xs text-red-500 hover:underline"
								>
									Remove & Retake
								</button>
							{:else}
								<button
									type="button"
									onclick={triggerCamera}
									class="mb-3 rounded-full bg-white p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
									aria-label="Take photo with camera"
								>
									<Camera class="h-8 w-8 text-green-500" />
								</button>

								<!-- Two options for photo input -->
								<div class="grid grid-cols-2 gap-3 mb-3">
									<button
										onclick={triggerCamera}
										type="button"
										class="rounded-lg bg-green-100 hover:bg-green-200 transition-colors py-3 px-3 text-center"
									>
										<Camera class="h-5 w-5 text-green-600 mx-auto mb-1" />
										<span class="block text-sm font-semibold text-green-700">Camera</span>
										<span class="text-xs text-green-600">Take new photo</span>
									</button>

									<button
										onclick={triggerGallery}
										type="button"
										class="rounded-lg bg-blue-100 hover:bg-blue-200 transition-colors py-3 px-3 text-center"
									>
										<ImageIcon class="h-5 w-5 text-blue-600 mx-auto mb-1" />
										<span class="block text-sm font-semibold text-blue-700">Gallery</span>
										<span class="text-xs text-blue-600">Choose existing</span>
									</button>
								</div>

								<!-- Camera input - forces camera on mobile -->
								<input
									id="camera-input"
									type="file"
									accept="image/*"
									capture="environment"
									class="hidden"
									onchange={handleFileSelect}
									multiple={false}
								/>

								<!-- Gallery input - allows photo library selection -->
								<input
									id="gallery-input"
									type="file"
									accept="image/*"
									class="hidden"
									onchange={handleFileSelect}
									multiple={false}
								/>
							{/if}
						</div>
					</div>
				{:else}
					<PhotoSelector {userId} {selectedPhotoId} onSelect={handleLibrarySelect} />
				{/if}

				<div class="mt-6 flex gap-3">
					<button
						onclick={onClose}
						disabled={submitting}
						class="flex-1 rounded-xl border border-gray-200 py-3 font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
					>
						Cancel
					</button>
					<button
						onclick={handleSubmit}
						disabled={(!tempFile && !selectedPhotoId) || submitting}
						class="flex-[2] rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 py-3 font-semibold text-white shadow-md transition-all hover:scale-[1.02] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
					>
						{#if submitting}
							<span class="flex items-center justify-center gap-2">
								<Loader class="h-5 w-5 animate-spin" />
								{uploading ? 'Uploading...' : 'Verifying...'}
							</span>
						{:else}
							Submit Entry
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
