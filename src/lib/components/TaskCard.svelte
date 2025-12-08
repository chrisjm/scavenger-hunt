<script lang="ts">
	interface Task {
		id: number;
		description: string;
		unlocked: boolean;
		unlockDate: string;
	}

	interface Props {
		task: Task;
		onOpenSubmission: (task: Task) => void;
		onOpenCompleted?: (task: Task) => void;
		isCompleted?: boolean;
	}

	let { task, onOpenSubmission, onOpenCompleted, isCompleted = false }: Props = $props();

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
	class="group relative overflow-hidden rounded-xl border-2 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg {isCompleted
		? 'bg-emerald-50 border-emerald-200 hover:border-emerald-300'
		: task.unlocked
			? 'bg-white border-green-100 hover:border-green-300'
			: 'bg-gray-50 border-gray-100'}"
>
	<div class="absolute right-3 top-3">
		{#if isCompleted}
			<div
				class="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700"
			>
				✅ Complete
			</div>
		{:else if task.unlocked}
			<div
				class="rounded-full border border-green-200 bg-green-50 px-2 py-1 text-xs font-semibold text-green-700"
			>
				🔓 Open
			</div>
		{:else}
			<div
				class="rounded-full border border-gray-200 bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-500"
			>
				🔒 Locked
			</div>
		{/if}
	</div>

	<div class="p-5">
		<div class="mb-4 flex items-center gap-4">
			<div
				class="flex h-14 w-14 items-center justify-center rounded-2xl text-3xl shadow-sm {isCompleted
					? 'bg-emerald-100'
					: task.unlocked
						? 'bg-green-100'
						: 'bg-gray-200 opacity-50'}"
			>
				{getTaskIcon(task.description)}
			</div>
			<div>
				<h3 class="text-lg font-bold text-gray-800 leading-tight">{task.description}</h3>
				{#if !task.unlocked}
					<p class="text-xs font-medium text-amber-600 mt-1">
						Available {new Date(task.unlockDate).toLocaleDateString(undefined, {
							month: 'short',
							day: 'numeric'
						})}
					</p>
				{/if}
			</div>
		</div>

		<button
			onclick={() => {
				if (isCompleted && onOpenCompleted) {
					onOpenCompleted(task);
				} else {
					onOpenSubmission(task);
				}
			}}
			disabled={!task.unlocked}
			class="w-full rounded-xl py-3 font-semibold transition-all {isCompleted
				? 'bg-emerald-600 text-white shadow-md hover:bg-emerald-700 hover:shadow-lg active:scale-95'
				: task.unlocked
					? 'bg-green-600 text-white shadow-md hover:bg-green-700 hover:shadow-lg active:scale-95'
					: 'cursor-not-allowed bg-gray-200 text-gray-400'}"
		>
			{#if isCompleted}
				👁️ View Submission
			{:else if task.unlocked}
				Complete Task
			{:else}
				Locked
			{/if}
		</button>
	</div>
</div>
