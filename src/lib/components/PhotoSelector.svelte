<script lang="ts">
	import { onMount } from 'svelte';
	import { Loader, Image as ImageIcon } from 'lucide-svelte';

	interface Photo {
		id: string;
		filePath: string;
		createdAt: string;
	}

	interface Props {
		userId: string;
		selectedPhotoId: string | null;
		onSelect: (photo: Photo) => void;
	}

	let { userId, selectedPhotoId, onSelect }: Props = $props();

	let photos = $state<Photo[]>([]);
	let loading = $state(true);

	onMount(async () => {
		try {
			const res = await fetch(`/api/library?userId=${userId}`);
			if (res.ok) {
				photos = await res.json();
			}
		} catch (e) {
			console.error('Failed to load library', e);
		} finally {
			loading = false;
		}
	});
</script>

<div class="h-64 overflow-y-auto border border-gray-200 rounded-lg p-2 bg-gray-50">
	{#if loading}
		<div class="flex h-full items-center justify-center">
			<Loader class="h-8 w-8 animate-spin text-gray-400" />
		</div>
	{:else if photos.length === 0}
		<div class="flex h-full flex-col items-center justify-center text-gray-400">
			<ImageIcon class="mb-2 h-8 w-8 opacity-50" />
			<p class="text-sm">No photos in library</p>
		</div>
	{:else}
		<div class="grid grid-cols-3 gap-2 sm:grid-cols-4">
			{#each photos as photo (photo.id)}
				<button
					type="button"
					onclick={() => onSelect(photo)}
					class="relative aspect-square overflow-hidden rounded-md border-2 transition-all hover:opacity-90 focus:outline-none {selectedPhotoId ===
					photo.id
						? 'border-green-500 ring-2 ring-green-500 ring-offset-1'
						: 'border-transparent'}"
				>
					<img
						src={photo.filePath}
						alt="Library item"
						class="h-full w-full object-cover"
						loading="lazy"
					/>
					{#if selectedPhotoId === photo.id}
						<div class="absolute inset-0 flex items-center justify-center bg-black/20">
							<div class="rounded-full bg-green-500 p-1">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									class="h-4 w-4 text-white"
									stroke-width="3"
								>
									<polyline points="20 6 9 17 4 12" />
								</svg>
							</div>
						</div>
					{/if}
				</button>
			{/each}
		</div>
	{/if}
</div>
