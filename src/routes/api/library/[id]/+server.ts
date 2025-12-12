// ABOUTME: Provides the authenticated user's photo library (delete).
// ABOUTME: Uses S3 for storage

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { and, eq } from 'drizzle-orm';
import { db, schema } from '$lib/server/db';
import { deleteFromS3, extractKeyFromUrl } from '$lib/utils/s3';

// DELETE /api/library/:id
export const DELETE: RequestHandler = async ({ params, locals }) => {
	try {
		const authUser = locals.user;
		if (!authUser) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { id } = params;
		const userId = authUser.userId;
		const { photos } = schema;

		// 1. Verify ownership
		const photo = await db
			.select()
			.from(photos)
			.where(and(eq(photos.id, id), eq(photos.userId, userId)))
			.get();

		if (!photo) {
			return json({ error: 'Photo not found or unauthorized' }, { status: 404 });
		}

		// 2. Delete file from S3
		const key = extractKeyFromUrl(photo.filePath);
		await deleteFromS3(key).catch((err) => console.error('File delete warning:', err));

		// 3. Delete from DB
		await db.delete(photos).where(eq(photos.id, id));

		return json({ success: true });
	} catch (error) {
		console.error('Delete error (SvelteKit library):', error);
		return json({ error: 'Delete failed' }, { status: 500 });
	}
};
