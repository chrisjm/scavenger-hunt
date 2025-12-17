<script lang="ts">
	import Submission from './Submission.svelte';

	interface Task {
		id: number;
		description: string;
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
</script>

<Submission {show} {task} {userId} {groupId} {onClose} {onSuccess} />
