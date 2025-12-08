<script lang="ts">
	import TaskCard from './TaskCard.svelte';
	import SubmissionModal from './SubmissionModal.svelte';

	interface Task {
		id: number;
		description: string;
		unlocked: boolean;
		unlockDate: string;
	}

	interface Props {
		tasks: Task[];
		loading: boolean;
		userId: string | null;
		completedTaskIds?: Set<number>;
	}

	let { tasks, loading, userId, completedTaskIds }: Props = $props();

	let showModal = $state(false);
	let selectedTask = $state<Task | null>(null);

	function openSubmission(task: Task) {
		selectedTask = task;
		showModal = true;
	}

	function handleSuccess(result: any) {
		showModal = false;
		// Success alert logic is better handled here than in the modal
		const message = result.submission.valid
			? `🎉 SUCCESS!\n\n${result.submission.aiReasoning}`
			: `❌ Not quite...\n\n${result.submission.aiReasoning}`;

		alert(message);
	}
</script>

{#if loading}
	<div class="py-12 text-center">
		<div class="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-green-600"></div>
		<p class="mt-2 text-gray-500">Loading tasks...</p>
	</div>
{:else}
	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
		{#each tasks as task (task.id)}
			<TaskCard
				{task}
				onOpenSubmission={openSubmission}
				isCompleted={completedTaskIds?.has(task.id) ?? false}
			/>
		{/each}
	</div>
{/if}

{#if userId && selectedTask}
	<SubmissionModal
		show={showModal}
		task={selectedTask}
		{userId}
		onClose={() => (showModal = false)}
		onSuccess={handleSuccess}
	/>
{/if}
