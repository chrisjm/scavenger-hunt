// ABOUTME: Deletes a submission owned by the current authenticated user.
// ABOUTME: Ensures only owners can remove their own submissions.

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { eq } from 'drizzle-orm';
import { db, schema } from '$lib/server/db';

export const DELETE: RequestHandler = async ({ params, locals }) => {
	try {
		const authUser = locals.user;
		if (!authUser) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { id } = params;
		const userId = authUser.userId;

		if (!userId) {
			return json({ error: 'User ID is required' }, { status: 400 });
		}

		const { submissions } = schema;

		// Verify the submission exists and belongs to the user
		const submission = await db.select().from(submissions).where(eq(submissions.id, id)).get();

		if (!submission) {
			return json({ error: 'Submission not found' }, { status: 404 });
		}

		if (submission.userId !== userId) {
			return json({ error: 'You can only delete your own submissions' }, { status: 403 });
		}

		await db.delete(submissions).where(eq(submissions.id, id));

		return json({ success: true, message: 'Submission deleted successfully' });
	} catch (error) {
		console.error('Error deleting submission (SvelteKit):', error);
		return json({ error: 'Failed to delete submission' }, { status: 500 });
	}
};
