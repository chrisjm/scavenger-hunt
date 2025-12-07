<script lang="ts">
	interface Task {
		id: number;
		description: string;
		unlocked: boolean;
		unlockDate: string;
	}

	interface Props {
		task: Task;
		selectedFile: File | null;
		uploading: boolean;
		onUpload: (taskId: number) => Promise<void>;
	}

	let { task, selectedFile, uploading, onUpload }: Props = $props();

	function getTaskIcon(description: string): string {
		if (description.includes('Santa')) return '🎅';
		if (description.includes('Tree')) return '🎄';
		if (description.includes('Lights')) return '✨';
		if (description.includes('Candy')) return '🍭';
		if (description.includes('Snowman')) return '⛄';
		if (description.includes('Reindeer')) return '🦌';
		if (description.includes('Cookie')) return '🍪';
		if (description.includes('Stocking')) return '🧦';
		return '🎁';
	}
</script>

<div
	class="group relative overflow-hidden rounded-xl border-2 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 {task.unlocked
		? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 hover:border-green-300'
		: 'bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200 hover:border-gray-300'}"
>
	<!-- Status Badge -->
	<div class="absolute top-3 right-3">
		{#if task.unlocked}
			<div
				class="bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded-full border border-green-200"
			>
				🔓 Available
			</div>
		{:else}
			<div
				class="bg-gray-100 text-gray-600 text-xs font-semibold px-2 py-1 rounded-full border border-gray-200"
			>
				🔒 Locked
			</div>
		{/if}
	</div>

	<div class="p-4 md:p-6">
		<!-- Task Icon and Title -->
		<div class="flex items-start gap-3 mb-4">
			<div
				class="w-12 h-12 rounded-full flex items-center justify-center {task.unlocked
					? 'bg-green-100'
					: 'bg-gray-100'}"
			>
				<span class="text-2xl">{getTaskIcon(task.description)}</span>
			</div>
			<div class="flex-1">
				<h3 class="font-bold text-lg text-gray-800 mb-1">{task.description}</h3>
				<div class="flex items-center gap-2 text-sm text-gray-600">
					<span class="inline-flex items-center gap-1">
						<span class="w-2 h-2 rounded-full {task.unlocked ? 'bg-green-400' : 'bg-gray-400'}"
						></span>
						{task.unlocked ? 'Ready to submit' : 'Coming soon'}
					</span>
				</div>
			</div>
		</div>

		{#if !task.unlocked}
			<div class="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
				<div class="flex items-center gap-2 text-amber-800">
					<span>⏰</span>
					<span class="text-sm font-medium">
						Unlocks: {new Date(task.unlockDate).toLocaleDateString('en-US', {
							weekday: 'short',
							month: 'short',
							day: 'numeric'
						})}
					</span>
				</div>
			</div>
		{/if}

		<button
			onclick={() => onUpload(task.id)}
			disabled={!task.unlocked || uploading || !selectedFile}
			class="w-full py-3 px-4 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100 {task.unlocked &&
			selectedFile &&
			!uploading
				? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-md hover:shadow-lg'
				: 'bg-gray-200 text-gray-500 cursor-not-allowed'}"
		>
			{#if uploading}
				<div class="flex items-center justify-center gap-2">
					<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
					<span>Uploading...</span>
				</div>
			{:else if !task.unlocked}
				<span>🔒 Task Locked</span>
			{:else if !selectedFile}
				<span>📸 Select Photo First</span>
			{:else}
				<span>🚀 Submit Photo</span>
			{/if}
		</button>
	</div>
</div>
