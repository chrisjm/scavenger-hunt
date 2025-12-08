<script lang="ts">
	import TaskCard from './TaskCard.svelte';
	import SubmissionModal from './SubmissionModal.svelte';
	import CompletedTaskModal from './CompletedTaskModal.svelte';

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
		userSubmissions?: any[];
	}

	let { tasks, loading, userId, completedTaskIds, userSubmissions = [] }: Props = $props();

	let showModal = $state(false);
	let showCompletedModal = $state(false);
	let selectedTask = $state<Task | null>(null);
	let selectedSubmission = $state<any | null>(null);

	function openSubmission(task: Task) {
		selectedTask = task;
		showModal = true;
	}

	function openCompletedTask(task: Task) {
		// Find the user's submission for this task
		const submission = userSubmissions.find((sub) => sub.taskId === task.id && sub.valid);
		if (submission) {
			selectedTask = task;
			selectedSubmission = submission;
			showCompletedModal = true;
		}
	}

	function handleSuccess(result: any) {
		showModal = false;
		// Success alert logic is better handled here than in the modal
		const message = result.submission.valid
			? `🎉 SUCCESS!\n\n${result.submission.aiReasoning}`
			: `❌ Not quite...\n\n${result.submission.aiReasoning}`;

		alert(message);
	}

	async function handleRemoveSubmission(submissionId: string) {
		if (!userId) return;

		try {
			const response = await fetch(`/api/submissions/${submissionId}`, {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ userId })
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to remove submission');
			}

			// The socket listener will handle updating the UI
			alert('Submission removed successfully! You can now try again.');
		} catch (error) {
			console.error('Error removing submission:', error);
			alert(error instanceof Error ? error.message : 'Failed to remove submission');
		}
	}

	function handleRetryTask(task: Task) {
		// Open the submission modal for retry
		openSubmission(task);
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
				onOpenCompleted={openCompletedTask}
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

{#if userId && selectedTask && selectedSubmission}
	<CompletedTaskModal
		show={showCompletedModal}
		task={selectedTask}
		submission={selectedSubmission}
		{userId}
		onClose={() => (showCompletedModal = false)}
		onRemove={handleRemoveSubmission}
		onRetry={handleRetryTask}
	/>
{/if}
