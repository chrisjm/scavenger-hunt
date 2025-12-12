<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
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
		completedTaskIds?: Set<number>;
		userSubmissions?: SubmissionSummary[];
	}

	interface SubmissionSummary {
		id: string;
		taskId: number;
		valid: boolean;
	}

	let { tasks, loading, completedTaskIds, userSubmissions = [] }: Props = $props();

	function openSubmission(task: Task) {
		goto(resolve(`/tasks/${task.id}/submit`));
	}

	function openCompletedTask(task: Task) {
		// Find the user's approved submission for this task and navigate to its detail page
		const submission = userSubmissions.find((sub) => sub.taskId === task.id && sub.valid);
		if (submission) {
			goto(resolve(`/tasks/${task.id}/submission/${submission.id}`));
		}
	}
</script>

{#if loading}
	<div class="py-12 text-center">
		<div class="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-green-600"></div>
		<p class="mt-2 text-gray-500 dark:text-slate-400">Loading tasks...</p>
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
