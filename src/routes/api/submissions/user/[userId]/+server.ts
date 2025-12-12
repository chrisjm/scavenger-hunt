// ABOUTME: Returns submissions for a specific user, optionally scoped to a group.
// ABOUTME: Restricted to admin users via the session-derived locals.

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { and, eq } from 'drizzle-orm';
import { db, schema } from '$lib/server/db';

export const GET: RequestHandler = async ({ params, url, locals }) => {
  try {
    const authUser = locals.user;
    if (!authUser) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!authUser.isAdmin) {
      return json({ error: 'Forbidden: admin access required' }, { status: 403 });
    }

    const userId = params.userId;
    const groupId = url.searchParams.get('groupId');
    if (!userId) {
      return json({ error: 'userId is required' }, { status: 400 });
    }

    const { submissions, tasks, userProfiles, photos } = schema;

    const conditions = [eq(submissions.userId, userId)];
    if (groupId) {
      conditions.push(eq(submissions.groupId, groupId));
    }

    const userSubmissions = await db
      .select({
        id: submissions.id,
        userId: submissions.userId,
        groupId: submissions.groupId,
        taskId: submissions.taskId,
        photoId: submissions.photoId,
        aiMatch: submissions.aiMatch,
        aiConfidence: submissions.aiConfidence,
        aiReasoning: submissions.aiReasoning,
        valid: submissions.valid,
        submittedAt: submissions.submittedAt,
        taskDescription: tasks.description,
        userName: userProfiles.displayName,
        imagePath: photos.filePath
      })
      .from(submissions)
      .innerJoin(tasks, eq(submissions.taskId, tasks.id))
      .innerJoin(userProfiles, eq(submissions.userId, userProfiles.id))
      .innerJoin(photos, eq(submissions.photoId, photos.id))
      .where(and(...conditions));

    return json(userSubmissions);
  } catch (error) {
    console.error('Error fetching user submissions (SvelteKit):', error);
    return json({ error: 'Failed to fetch user submissions' }, { status: 500 });
  }
};
