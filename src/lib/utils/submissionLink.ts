export interface SubmissionLinkParams {
	id: string;
	taskId: number | string;
}

export function buildSubmissionLink({ id, taskId }: SubmissionLinkParams): string {
	return `/tasks/${taskId}/submission/${id}`;
}
