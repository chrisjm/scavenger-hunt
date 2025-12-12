<script lang="ts">
	import { Camera, Image as ImageIcon, Loader, Upload } from 'lucide-svelte';
	import PhotoSelector from './PhotoSelector.svelte';

	interface Task {
		id: number;
		description: string;
	}

	interface PhotoSummary {
		id: string;
	}

	interface SubmissionSuccessResult {
		submission?: {
			id?: string;
		};
		[key: string]: unknown;
	}

	interface Props {
		show: boolean;
		task: Task;
		userId: string;
		groupId: string;
		onClose: () => void;
		onSuccess: (result: SubmissionSuccessResult) => void;
	}

	let { show, task, userId, groupId, onClose, onSuccess }: Props = $props();

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
	function handleLibrarySelect(photo: PhotoSummary) {
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
					photoId: finalPhotoId,
					groupId
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
	<section class="rounded-2xl border border-slate-800/60 bg-slate-900/80 p-6 shadow-xl">
		<div class="flex items-start gap-3 mb-4">
			<div class="h-11 w-11 rounded-xl bg-emerald-500/15 text-emerald-200 grid place-items-center">
				<Upload class="h-5 w-5" />
			</div>
			<div class="flex-1">
				<p class="text-xs uppercase tracking-[0.18em] text-slate-500">Submit entry</p>
				<h3 class="text-xl font-semibold text-white leading-tight">Task: {task.description}</h3>
				<p class="text-slate-400 text-sm mt-1">
					Upload a new photo or pick from your library, then send it for review.
				</p>
			</div>
			<button
				onclick={onClose}
				class="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:border-slate-500 hover:text-white transition-colors"
			>
				Close
			</button>
		</div>

		<div class="flex border border-slate-800 rounded-xl overflow-hidden mb-4 bg-slate-900">
			<button
				class="flex-1 py-3 text-sm font-medium transition-colors {activeTab === 'upload'
					? 'bg-emerald-500/10 text-emerald-200 border-b-2 border-emerald-400'
					: 'text-slate-400 hover:bg-slate-800/60'}"
				onclick={() => (activeTab = 'upload')}
			>
				<span class="flex items-center justify-center gap-2">
					<Camera class="h-4 w-4" /> Camera & Gallery
				</span>
			</button>
			<button
				class="flex-1 py-3 text-sm font-medium transition-colors {activeTab === 'library'
					? 'bg-emerald-500/10 text-emerald-200 border-b-2 border-emerald-400'
					: 'text-slate-400 hover:bg-slate-800/60'}"
				onclick={() => (activeTab = 'library')}
			>
				<span class="flex items-center justify-center gap-2">
					<ImageIcon class="h-4 w-4" /> From Library
				</span>
			</button>
		</div>

		<div class="grid lg:grid-cols-[1.2fr_1fr] gap-4 items-start">
			<div class="rounded-xl border border-slate-800 bg-slate-950/40 p-5">
				{#if activeTab === 'upload'}
					<div class="space-y-4">
						<div
							class="relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-700 bg-slate-900/60 p-6 transition-colors hover:border-emerald-400 hover:bg-slate-900"
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
									class="mt-2 text-xs text-red-400 hover:underline"
								>
									Remove & Retake
								</button>
							{:else}
								<button
									type="button"
									onclick={triggerCamera}
									class="mb-3 rounded-full bg-slate-950 p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
									aria-label="Take photo with camera"
								>
									<Camera class="h-8 w-8 text-emerald-400" />
								</button>

								<!-- Two options for photo input -->
								<div class="grid grid-cols-2 gap-3 mb-3 w-full">
									<button
										onclick={triggerCamera}
										type="button"
										class="rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 transition-colors py-3 px-3 text-center"
									>
										<Camera class="h-5 w-5 text-emerald-300 mx-auto mb-1" />
										<span class="block text-sm font-semibold text-emerald-100">Camera</span>
										<span class="text-xs text-emerald-200">Take new photo</span>
									</button>

									<button
										onclick={triggerGallery}
										type="button"
										class="rounded-lg bg-blue-500/10 hover:bg-blue-500/20 transition-colors py-3 px-3 text-center"
									>
										<ImageIcon class="h-5 w-5 text-blue-200 mx-auto mb-1" />
										<span class="block text-sm font-semibold text-blue-100">Gallery</span>
										<span class="text-xs text-blue-200">Choose existing</span>
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
			</div>

			<div class="rounded-xl border border-slate-800 bg-slate-950/40 p-5 flex flex-col gap-4">
				<div class="flex items-start justify-between">
					<div>
						<p class="text-xs uppercase tracking-[0.18em] text-slate-500">Review</p>
						<h4 class="text-lg font-semibold text-white">Ready to submit?</h4>
						<p class="text-slate-400 text-sm">
							Make sure the task objective is visible and clear in the photo.
						</p>
					</div>
				</div>

				<div class="flex gap-3">
					<button
						onclick={onClose}
						disabled={submitting}
						class="flex-1 rounded-xl border border-slate-700 py-3 font-medium text-slate-200 transition-colors hover:bg-slate-800 disabled:opacity-50"
					>
						Cancel
					</button>
					<button
						onclick={handleSubmit}
						disabled={(!tempFile && !selectedPhotoId) || submitting}
						class="flex-[1.5] rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3 font-semibold text-white shadow-lg transition-all hover:scale-[1.01] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
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
	</section>
{/if}
