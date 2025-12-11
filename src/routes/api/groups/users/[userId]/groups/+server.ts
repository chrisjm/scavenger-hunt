// ABOUTME: Returns the list of groups the current authenticated user belongs to.
// ABOUTME: Ignores the path userId and trusts the session user for membership lookup.

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { eq } from 'drizzle-orm';
import { db, schema } from '$lib/server/db';

export const GET: RequestHandler = async ({ locals }) => {
  try {
    const authUser = locals.user;
    if (!authUser) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authUser.userId;
    const { groups, userGroups } = schema;

    const rows = await db
      .select({
        id: groups.id,
        name: groups.name,
        description: groups.description
      })
      .from(userGroups)
      .innerJoin(groups, eq(userGroups.groupId, groups.id))
      .where(eq(userGroups.userId, userId));

    return json(rows);
  } catch (error) {
    console.error('Error fetching user groups (SvelteKit):', error);
    return json({ error: 'Failed to fetch user groups' }, { status: 500 });
  }
};
