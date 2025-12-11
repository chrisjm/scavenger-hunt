// ABOUTME: Allows the current authenticated user to leave a group by ID.
// ABOUTME: Ignores the path userId and scopes deletion to the session user.

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { and, eq } from 'drizzle-orm';
import { db, schema } from '$lib/server/db';

export const DELETE: RequestHandler = async ({ params, locals }) => {
  try {
    const authUser = locals.user;
    if (!authUser) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const groupId = params.groupId;
    const userId = authUser.userId;

    const { userGroups } = schema;

    const membership = await db
      .select()
      .from(userGroups)
      .where(and(eq(userGroups.groupId, groupId), eq(userGroups.userId, userId)))
      .limit(1);
    if (!membership.length) {
      return json({ error: 'Membership not found' }, { status: 404 });
    }

    await db
      .delete(userGroups)
      .where(and(eq(userGroups.groupId, groupId), eq(userGroups.userId, userId)));

    return json({ success: true });
  } catch (error) {
    console.error('Error leaving group (SvelteKit):', error);
    return json({ error: 'Failed to leave group' }, { status: 500 });
  }
};
