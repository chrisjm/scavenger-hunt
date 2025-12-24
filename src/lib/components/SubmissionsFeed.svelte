<script lang="ts">
	import SubmissionsList from './SubmissionsList.svelte';

	import type { SubmissionListItem } from '$lib/types/submission';

	interface Props {
		submissions: SubmissionListItem[];
	}

	let { submissions }: Props = $props();
</script>

<SubmissionsList {submissions} />
