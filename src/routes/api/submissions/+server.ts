// ABOUTME: Handles creation of submissions and group-scoped submission feed for the scavenger hunt.
// ABOUTME: Uses AI validation and S3-backed photos while enforcing group membership and ownership.

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { and, count, desc, eq } from 'drizzle-orm';
import { db, schema } from '$lib/server/db';
import { extractKeyFromUrl, fetchObjectBuffer } from '../../../../server/utils/s3.js';
import { validateImageWithAI, isSubmissionValid } from '../../../../server/utils/ai-validator.js';

// POST /api/submissions
export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const authUser = locals.user;
    if (!authUser) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const { taskId, photoId, groupId } = (body ?? {}) as {
      userId?: unknown;
      groupId?: unknown;
      photoId?: unknown;
      taskId?: unknown;
    };

    const userId = authUser.userId;

    // 1. Validate inputs
    if (!userId || typeof taskId !== 'number' || typeof photoId !== 'string' || typeof groupId !== 'string') {
      return json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { tasks, submissions, users, photos, userGroups } = schema;

    // 2. Fetch context (Photo & Task & membership)
    const photo = await db.select().from(photos).where(eq(photos.id, photoId)).get();
    const task = await db.select().from(tasks).where(eq(tasks.id, taskId)).get();
    const user = await db.select().from(users).where(eq(users.id, userId)).get();
    const membership = await db
      .select()
      .from(userGroups)
      .where(and(eq(userGroups.userId, userId), eq(userGroups.groupId, groupId)))
      .get();

    if (!photo) return json({ error: 'Photo not found' }, { status: 404 });
    if (!task) return json({ error: 'Task not found' }, { status: 404 });
    if (!membership) return json({ error: 'User is not a member of this group' }, { status: 403 });

    // Security check: Ensure user owns the photo they are submitting
    if (photo.userId !== userId) {
      return json({ error: 'You do not own this photo' }, { status: 403 });
    }

    // 3. AI Validation (fetch from S3)
    const photoKey = extractKeyFromUrl(photo.filePath);
    let aiResponse;
    try {
      const photoBuffer = await fetchObjectBuffer(photoKey);
      aiResponse = await validateImageWithAI(photoBuffer, task);
    } catch (aiError) {
      console.error('AI validation failed:', aiError);
      return json({ error: 'AI validation failed' }, { status: 500 });
    }
    const valid = isSubmissionValid(aiResponse, task);

    // 4. Record submission (replace any existing submission for this user/task/group)
    await db
      .delete(submissions)
      .where(
        and(
          and(eq(submissions.userId, userId), eq(submissions.taskId, taskId)),
          eq(submissions.groupId, groupId)
        )
      );

    const [submission] = await db
      .insert(submissions)
      .values({
        userId,
        groupId,
        taskId,
        photoId,
        aiMatch: aiResponse.match,
        aiConfidence: aiResponse.confidence,
        aiReasoning: aiResponse.reasoning,
        valid
      })
      .returning();

    return json({ success: true, submission });
  } catch (error) {
    console.error('Submission error (SvelteKit):', error);
    return json({ error: 'Submission processing failed' }, { status: 500 });
  }
};

// GET /api/submissions - group feed (valid submissions only)
export const GET: RequestHandler = async ({ url, locals }) => {
  try {
    const authUser = locals.user;
    if (!authUser) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const groupId = url.searchParams.get('groupId');
    if (!groupId) {
      return json({ error: 'groupId is required' }, { status: 400 });
    }

    const { tasks, submissions, users, photos } = schema;

    const allSubmissions = await db
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
        userName: users.name,
        imagePath: photos.filePath
      })
      .from(submissions)
      .innerJoin(tasks, eq(submissions.taskId, tasks.id))
      .innerJoin(users, eq(submissions.userId, users.id))
      .innerJoin(photos, eq(submissions.photoId, photos.id))
      .where(and(eq(submissions.aiMatch, true), eq(submissions.groupId, groupId)))
      .orderBy(desc(submissions.submittedAt));

    return json(allSubmissions);
  } catch (error) {
    console.error('Error fetching submissions (SvelteKit):', error);
    return json({ error: 'Failed to fetch submissions' }, { status: 500 });
  }
};

// GET /api/submissions/all - scoped submissions for a group (admin vs non-admin)
export const _GET_all: RequestHandler = async ({ url, locals }) => {
  try {
    const authUser = locals.user;
    if (!authUser) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const groupId = url.searchParams.get('groupId');
    if (!groupId) {
      return json({ error: 'groupId is required' }, { status: 400 });
    }

    const { tasks, submissions, users, photos } = schema;

    const conditions = [eq(submissions.groupId, groupId)];
    if (!authUser.isAdmin && authUser.userId) {
      conditions.push(eq(submissions.userId, authUser.userId));
    }

    const scopedSubmissions = await db
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
        userName: users.name,
        imagePath: photos.filePath
      })
      .from(submissions)
      .innerJoin(tasks, eq(submissions.taskId, tasks.id))
      .innerJoin(users, eq(submissions.userId, users.id))
      .innerJoin(photos, eq(submissions.photoId, photos.id))
      .where(and(...conditions))
      .orderBy(desc(submissions.submittedAt));

    return json(scopedSubmissions);
  } catch (error) {
    console.error('Error fetching all group submissions (SvelteKit):', error);
    return json({ error: 'Failed to fetch all group submissions' }, { status: 500 });
  }
};

// GET /api/submissions/leaderboard - group-only leaderboard
export const _GET_leaderboard: RequestHandler = async ({ url, locals }) => {
  try {
    const authUser = locals.user;
    if (!authUser) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const groupId = url.searchParams.get('groupId');
    if (!groupId) {
      return json({ error: 'groupId is required' }, { status: 400 });
    }

    const { submissions, users } = schema;

    const leaderboard = await db
      .select({
        name: users.name,
        score: count(submissions.id)
      })
      .from(submissions)
      .innerJoin(users, eq(submissions.userId, users.id))
      .where(and(eq(submissions.valid, true), eq(submissions.groupId, groupId)))
      .groupBy(users.name)
      .orderBy(desc(count(submissions.id)));

    return json(leaderboard);
  } catch (error) {
    console.error('Error fetching leaderboard (SvelteKit):', error);
    return json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
};
