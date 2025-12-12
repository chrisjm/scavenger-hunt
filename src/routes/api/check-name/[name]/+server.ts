// ABOUTME: Checks whether a proposed display name is available for registration.
// ABOUTME: Performs case-insensitive uniqueness checks against existing users.

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sql } from 'drizzle-orm';
import { db, schema } from '$lib/server/db';

export const GET: RequestHandler = async ({ params }) => {
  try {
    const rawName = params.name;

    if (!rawName || rawName.trim().length === 0) {
      return json({ error: 'Name is required' }, { status: 400 });
    }

    const trimmedName = rawName.trim();

    if (trimmedName.length < 2 || trimmedName.length > 30) {
      return json(
        {
          available: false,
          text: 'Name must be between 2 and 30 characters'
        },
        { status: 400 }
      );
    }

    const { userProfiles } = schema;
    const existingUser = await db
      .select()
      .from(userProfiles)
      .where(sql`lower(${userProfiles.displayName}) = lower(${trimmedName})`)
      .limit(1);

    return json({
      available: existingUser.length === 0,
      name: trimmedName
    });
  } catch (error) {
    console.error('Name check error (SvelteKit):', error);
    return json({ error: 'Failed to check name availability' }, { status: 500 });
  }
};
