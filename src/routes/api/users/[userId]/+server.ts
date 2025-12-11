// ABOUTME: Provides user profile retrieval and update endpoints for the authenticated player.
// ABOUTME: Uses auth_token-backed sessions and ignores mismatched path parameters for safety.

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { eq, sql } from 'drizzle-orm';
import { db, schema } from '$lib/server/db';

export const GET: RequestHandler = async ({ locals }) => {
  try {
    const authUser = locals.user;
    if (!authUser) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { users } = schema;
    const userRows = await db
      .select()
      .from(users)
      .where(eq(users.id, authUser.userId))
      .limit(1);

    if (userRows.length === 0) {
      return json({ error: 'User not found' }, { status: 404 });
    }

    return json({ user: userRows[0] });
  } catch (error) {
    console.error('Error fetching user (SvelteKit):', error);
    return json({ error: 'Failed to fetch user' }, { status: 500 });
  }
};

export const PUT: RequestHandler = async ({ locals, request }) => {
  try {
    const authUser = locals.user;
    if (!authUser) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const { name } = (body ?? {}) as { name?: unknown };

    if (typeof name !== 'string') {
      return json({ error: 'Name is required and must be a string' }, { status: 400 });
    }

    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 30) {
      return json({ error: 'Name must be between 2 and 30 characters' }, { status: 400 });
    }

    const { users } = schema;
    const userId = authUser.userId;

    // Check if user exists
    const existingUser = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (existingUser.length === 0) {
      return json({ error: 'User not found' }, { status: 404 });
    }

    // Check if the new name is already taken by another user (case-insensitive)
    const nameConflict = await db
      .select()
      .from(users)
      .where(sql`lower(${users.name}) = lower(${trimmedName})`)
      .limit(1);

    if (nameConflict.length > 0 && nameConflict[0].id !== userId) {
      return json(
        {
          error: 'Name already taken',
          message: `"${trimmedName}" is already taken. Please choose a different name.`
        },
        { status: 409 }
      );
    }

    // Update user name
    await db.update(users).set({ name: trimmedName }).where(eq(users.id, userId));

    // Return updated user
    const updatedUser = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    return json({ user: updatedUser[0] });
  } catch (error) {
    console.error('Error updating user (SvelteKit):', error);
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      return json(
        {
          error: 'Name already taken',
          message: 'This name is already taken. Please choose a different name.'
        },
        { status: 409 }
      );
    }
    return json({ error: 'Failed to update user profile' }, { status: 500 });
  }
};
