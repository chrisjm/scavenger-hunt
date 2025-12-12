// ABOUTME: Allows an authenticated user to join an existing group by ID.
// ABOUTME: Validates group and membership before inserting join row.

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { and, eq } from 'drizzle-orm';
import crypto from 'node:crypto';
import { db, schema } from '$lib/server/db';

export const POST: RequestHandler = async ({ params, locals }) => {
  try {
    const authUser = locals.user;
    if (!authUser) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const groupId = params.groupId;
    const userId = authUser.userId;
    if (!userId || !groupId) {
      return json({ error: 'userId and groupId are required' }, { status: 400 });
    }

    const { groups, userProfiles, userGroups } = schema;

    // Validate group
    const groupRows = await db.select().from(groups).where(eq(groups.id, groupId)).limit(1);
    if (!groupRows.length) {
      return json({ error: 'Group not found' }, { status: 404 });
    }

    // Validate user
    const userRows = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.id, userId))
      .limit(1);
    if (!userRows.length) {
      return json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent duplicates
    const existing = await db
      .select()
      .from(userGroups)
      .where(and(eq(userGroups.userId, userId), eq(userGroups.groupId, groupId)))
      .limit(1);
    if (existing.length) {
      return json({ error: 'Already a member of this group' }, { status: 409 });
    }

    await db.insert(userGroups).values({
      id: crypto.randomUUID(),
      userId,
      groupId
    });

    return json({ success: true });
  } catch (error) {
    console.error('Error joining group (SvelteKit):', error);
    return json({ error: 'Failed to join group' }, { status: 500 });
  }
};
