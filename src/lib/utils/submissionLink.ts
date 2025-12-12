export interface SubmissionLinkParams {
	id: string;
	taskId: number | string;
}

export function buildSubmissionLink({
	id,
	taskId
}: SubmissionLinkParams): `/tasks/${string}/submission/${string}` {
	return `/tasks/${taskId}/submission/${id}`;
}
