<script lang="ts">
	import {
		User,
		TreePine,
		Sparkles,
		Candy,
		Snowflake,
		Gift,
		Cookie,
		CheckCircle,
		Lock,
		Eye
	} from 'lucide-svelte';

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

	function getTaskIconType(description: string) {
		if (description.includes('Santa')) return 'user';
		if (description.includes('Tree')) return 'tree';
		if (description.includes('Lights')) return 'sparkles';
		if (description.includes('Candy')) return 'candy';
		if (description.includes('Snowman')) return 'snowflake';
		if (description.includes('Reindeer')) return 'reindeer';
		if (description.includes('Cookie')) return 'cookie';
		if (description.includes('Stocking')) return 'stocking';
		return 'gift';
	}

	let iconType = $derived(getTaskIconType(task.description));
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
				class="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 flex items-center gap-1"
			>
				<CheckCircle size={12} />
				Complete
			</div>
		{:else if !task.unlocked}
			<div
				class="rounded-full border border-gray-200 bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-500 flex items-center gap-1"
			>
				<Lock size={12} />
				Locked
			</div>
		{/if}
	</div>

	<div class="p-5">
		<div class="mb-4 flex items-center gap-4">
			<div
				class="flex h-14 w-14 items-center justify-center rounded-2xl shadow-sm {isCompleted
					? 'bg-emerald-100'
					: task.unlocked
						? 'bg-green-100'
						: 'bg-gray-200 opacity-50'}"
			>
				{#if iconType === 'user'}
					<User size={28} class="text-gray-700" />
				{:else if iconType === 'tree'}
					<TreePine size={28} class="text-gray-700" />
				{:else if iconType === 'sparkles'}
					<Sparkles size={28} class="text-gray-700" />
				{:else if iconType === 'candy'}
					<Candy size={28} class="text-gray-700" />
				{:else if iconType === 'snowflake'}
					<Snowflake size={28} class="text-gray-700" />
				{:else if iconType === 'cookie'}
					<Cookie size={28} class="text-gray-700" />
				{:else if iconType === 'reindeer'}
					<span class="text-3xl">🦌</span>
				{:else if iconType === 'stocking'}
					<span class="text-3xl">🧦</span>
				{:else}
					<Gift size={28} class="text-gray-700" />
				{/if}
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
				<div class="flex items-center justify-center gap-2">
					<Eye size={16} />
					View Submission
				</div>
			{:else if task.unlocked}
				Complete Task
			{:else}
				<div class="flex items-center justify-center gap-2">
					<Lock size={16} />
					Locked
				</div>
			{/if}
		</button>
	</div>
</div>
