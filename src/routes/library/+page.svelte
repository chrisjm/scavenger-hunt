<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import { Loader, Trash2, Upload } from 'lucide-svelte';
	import { getUserContext } from '$lib/stores/user';

	// Get user context from layout
	const userContext = getUserContext();
	let userId = $derived(userContext.userId);

	interface Photo {
		id: string;
		filePath: string;
	}

	let photos = $state<Photo[]>([]);
	let loading = $state(true);
	let uploading = $state(false);

	onMount(() => {
		if (userId) {
			loadLibrary();
		}
	});

	// Load library when userId becomes available
	$effect(() => {
		if (!browser) return;
		if (userId) {
			loadLibrary();
		}
	});

	async function loadLibrary() {
		try {
			const res = await fetch(`/api/library?userId=${userId}`);
			if (res.ok) photos = await res.json();
		} catch (err) {
			console.error(err);
		} finally {
			loading = false;
		}
	}

	async function handleUpload(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file || !userId) return;

		uploading = true;
		const formData = new FormData();
		formData.append('image', file);
		formData.append('userId', userId);

		try {
			const res = await fetch('/api/library/upload', {
				method: 'POST',
				body: formData
			});
			if (res.ok) {
				await loadLibrary();
			} else {
				alert('Upload failed');
			}
		} catch (error) {
			console.error(error);
			alert('Network error');
		} finally {
			uploading = false;
			target.value = '';
		}
	}

	async function deletePhoto(photoId: string) {
		if (!confirm('Are you sure you want to delete this photo?')) return;

		try {
			const res = await fetch(`/api/library/${photoId}`, {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ userId })
			});

			if (res.ok) {
				photos = photos.filter((p) => p.id !== photoId);
			}
		} catch (error) {
			console.error(error);
			alert('Failed to delete');
		}
	}
</script>

<div
	class="min-h-screen bg-gradient-to-br from-green-50 via-white to-red-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950"
>
	<div class="container mx-auto p-4 max-w-4xl">
		<div class="flex items-center justify-between mb-6">
			<h1 class="text-xl font-semibold text-gray-800 dark:text-slate-100">My Photo Library</h1>
			<div class="relative">
				<input
					type="file"
					id="library-upload"
					class="hidden"
					accept="image/*"
					onchange={handleUpload}
					disabled={uploading}
				/>
				<label
					for="library-upload"
					class="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 cursor-pointer transition-colors dark:bg-emerald-600 dark:hover:bg-emerald-500"
				>
					{#if uploading}
						<Loader class="w-4 h-4 animate-spin" />
						<span>Uploading...</span>
					{:else}
						<Upload class="w-4 h-4" />
						<span>Upload New</span>
					{/if}
				</label>
			</div>
		</div>

		{#if loading}
			<div class="text-center py-12">
				<Loader class="w-8 h-8 animate-spin mx-auto text-green-600 dark:text-emerald-400" />
			</div>
		{:else if photos.length === 0}
			<div
				class="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 dark:bg-slate-900 dark:border-slate-700"
			>
				<p class="text-gray-500 dark:text-slate-400">No photos yet. Upload one to get started!</p>
			</div>
		{:else}
			<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
				{#each photos as photo (photo.id)}
					<div
						class="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200 dark:bg-slate-800 dark:border-slate-700"
					>
						<img
							src={photo.filePath}
							alt="Library item"
							class="w-full h-full object-cover"
							loading="lazy"
						/>
						<div
							class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 dark:bg-black/60"
						>
							<button
								onclick={() => deletePhoto(photo.id)}
								class="p-2 bg-white/90 text-red-600 rounded-full hover:bg-white dark:bg-slate-900/90 dark:hover:bg-slate-900 dark:text-red-300"
								title="Delete"
							>
								<Trash2 class="w-5 h-5" />
							</button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
