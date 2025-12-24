import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { and, desc, eq, lt, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import { db, schema } from '$lib/server/db';

const { submissionReactionEvents, submissions, tasks, userProfiles } = schema;

const submitterProfiles = alias(userProfiles, 'submitter_profiles');
const reactorProfiles = alias(userProfiles, 'reactor_profiles');

async function ensureAdmin(userId: string) {
  const rows = await db.select().from(userProfiles).where(eq(userProfiles.id, userId)).limit(1);
  if (!rows.length) return { ok: false, status: 404, body: { error: 'User not found' } } as const;
  if (!rows[0].isAdmin)
    return { ok: false, status: 403, body: { error: 'Admin privileges required' } } as const;
  return { ok: true, user: rows[0] } as const;
}

export const GET: RequestHandler = async ({ locals, url }) => {
  const authUser = locals.user;
  if (!authUser) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminCheck = await ensureAdmin(authUser.userId);
  if (!adminCheck.ok) {
    return json(adminCheck.body, { status: adminCheck.status });
  }

  const perPage = Number(url.searchParams.get('perPage')) || 50;
  const cursor = url.searchParams.get('cursor');
  const submissionFilter = url.searchParams.get('submissionId');
  const reactorFilter = url.searchParams.get('reactorId');
  const actionFilter = url.searchParams.get('action');
  const emojiFilter = url.searchParams.get('emoji');
  const searchTerm = url.searchParams.get('q');

  const baseQuery = db
    .select({
      id: submissionReactionEvents.id,
      action: submissionReactionEvents.action,
      emoji: submissionReactionEvents.emoji,
      createdAt: submissionReactionEvents.createdAt,
      submissionId: submissionReactionEvents.submissionId,
      taskDescription: tasks.description,
      submitterId: submissions.userId,
      submitterName: submitterProfiles.displayName,
      reactorId: submissionReactionEvents.userId,
      reactorName: reactorProfiles.displayName
    })
    .from(submissionReactionEvents)
    .innerJoin(submissions, eq(submissionReactionEvents.submissionId, submissions.id))
    .innerJoin(tasks, eq(submissions.taskId, tasks.id))
    .innerJoin(submitterProfiles, eq(submissions.userId, submitterProfiles.id))
    .innerJoin(reactorProfiles, eq(submissionReactionEvents.userId, reactorProfiles.id));

  const conditions = [];
  if (submissionFilter) {
    conditions.push(eq(submissionReactionEvents.submissionId, submissionFilter));
  }
  if (reactorFilter) {
    conditions.push(eq(submissionReactionEvents.userId, reactorFilter));
  }
  if (actionFilter === 'add' || actionFilter === 'remove') {
    conditions.push(eq(submissionReactionEvents.action, actionFilter));
  }
  if (emojiFilter) {
    conditions.push(eq(submissionReactionEvents.emoji, emojiFilter));
  }
  if (searchTerm?.trim()) {
    const term = `%${searchTerm.trim().toLowerCase()}%`;
    conditions.push(
      or(
        sql`lower(${submitterProfiles.displayName}) like ${term}`,
        sql`lower(${reactorProfiles.displayName}) like ${term}`,
        sql`lower(${tasks.description}) like ${term}`
      )
    );
  }
  if (conditions.length > 0) {
    baseQuery.where(and(...conditions));
  }

  baseQuery.orderBy(desc(submissionReactionEvents.createdAt), desc(submissionReactionEvents.id)).limit(perPage + 1);

  if (cursor) {
    const [createdAtStr, eventId] = cursor.split('_');
    const createdAt = new Date(Number(createdAtStr));
    baseQuery.where(
      or(
        lt(submissionReactionEvents.createdAt, createdAt),
        and(eq(submissionReactionEvents.createdAt, createdAt), lt(submissionReactionEvents.id, eventId))
      )
    );
  }

  const rows = await baseQuery;
  const hasMore = rows.length > perPage;
  const events = rows.slice(0, perPage).map((row) => ({
    id: row.id,
    action: row.action,
    emoji: row.emoji,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    submissionId: row.submissionId,
    taskDescription: row.taskDescription,
    submitterId: row.submitterId,
    submitterName: row.submitterName,
    reactorId: row.reactorId,
    reactorName: row.reactorName
  }));

  let nextCursor: string | null = null;
  if (hasMore) {
    const last = rows[perPage];
    const createdAt = last.createdAt instanceof Date ? last.createdAt.getTime() : Number(last.createdAt);
    nextCursor = `${createdAt}_${last.id}`;
  }

  return json({ events, nextCursor });
};
