<script lang="ts">
	import TaskCard from './TaskCard.svelte';

	interface Task {
		id: number;
		description: string;
		unlocked: boolean;
		unlockDate: string;
	}

	interface Props {
		tasks: Task[];
		loading: boolean;
		selectedFile: File | null;
		uploading: boolean;
		onFileSelect: (event: Event) => void;
		onUpload: (taskId: number) => Promise<void>;
	}

	let { tasks, loading, selectedFile, uploading, onFileSelect, onUpload }: Props = $props();
</script>

<div
	class="bg-gradient-to-br from-white to-green-50 rounded-xl shadow-xl p-4 md:p-8 border border-green-100"
>
	<div class="flex items-center gap-3 mb-6">
		<div class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
			<span class="text-green-600 text-xl">📸</span>
		</div>
		<h2 class="text-2xl font-semibold text-gray-800">Submit Your Photo</h2>
	</div>

	<div class="mb-6">
		<div class="relative">
			<input
				type="file"
				accept="image/*"
				capture="environment"
				onchange={onFileSelect}
				class="block w-full text-sm text-gray-600 file:mr-2 md:file:mr-4 file:py-2 md:file:py-3 file:px-4 md:file:px-6 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gradient-to-r file:from-green-50 file:to-green-100 file:text-green-700 hover:file:from-green-100 hover:file:to-green-200 file:transition-all file:duration-200 file:shadow-sm hover:file:shadow-md border-2 border-dashed border-green-200 rounded-lg p-3 md:p-4 hover:border-green-300 transition-colors"
			/>
			{#if selectedFile}
				<div class="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
					<div class="flex items-center gap-2 flex-wrap">
						<span class="text-green-600">✅</span>
						<span class="text-sm font-medium text-green-800 truncate flex-1"
							>Selected: {selectedFile.name}</span
						>
						<span class="text-xs text-green-600 whitespace-nowrap"
							>({Math.round(selectedFile.size / 1024)}KB)</span
						>
					</div>
				</div>
			{/if}
		</div>
	</div>

	{#if loading}
		<div class="text-center py-8">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
			<p class="mt-2 text-gray-500">Loading tasks...</p>
		</div>
	{:else}
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each tasks as task (task.id)}
				<TaskCard {task} {selectedFile} {uploading} {onUpload} />
			{/each}
		</div>
	{/if}
</div>
