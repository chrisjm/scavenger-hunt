<script lang="ts">
	import SubmissionsList from './SubmissionsList.svelte';

	interface Submission {
		id: string;
		userName: string;
		taskDescription: string;
		imagePath: string;
		valid: boolean;
		aiReasoning: string;
		aiConfidence: number;
		submittedAt: string;
		taskId: number;
	}

	interface Props {
		submissions: Submission[];
	}

	let { submissions }: Props = $props();
</script>

<SubmissionsList {submissions} />
