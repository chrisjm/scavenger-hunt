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

    const { userProfiles } = schema;
    const rows = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.id, authUser.userId))
      .limit(1);

    if (!rows.length) {
      return json({ error: 'User not found' }, { status: 404 });
    }

    const row = rows[0];
    return json({ user: { ...row, name: row.displayName } });
  } catch (error) {
    console.error('Error fetching current user (SvelteKit):', error);
    return json({ error: 'Failed to fetch user' }, { status: 500 });
  }
};
