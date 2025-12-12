// ABOUTME: Exposes group listing and creation endpoints for the scavenger hunt.
// ABOUTME: Enforces admin-only creation while allowing any authenticated user to list groups.

import crypto from 'node:crypto';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { eq, sql } from 'drizzle-orm';
import { db, schema } from '$lib/server/db';

async function ensureAdmin(userId: string) {
  const { userProfiles } = schema;
  const rows = await db.select().from(userProfiles).where(eq(userProfiles.id, userId)).limit(1);
  if (!rows.length) return { ok: false, status: 404, body: { error: 'User not found' } } as const;
  if (!rows[0].isAdmin)
    return { ok: false, status: 403, body: { error: 'Admin privileges required' } } as const;
  return { ok: true, user: rows[0] } as const;
}

export const GET: RequestHandler = async () => {
  try {
    const { groups } = schema;
    const result = await db.select().from(groups);
    return json(result);
  } catch (error) {
    console.error('Error listing groups (SvelteKit):', error);
    return json({ error: 'Failed to list groups' }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ locals, request }) => {
  try {
    const authUser = locals.user;
    if (!authUser) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const { name, description } = (body ?? {}) as { name?: unknown; description?: unknown };

    if (typeof name !== 'string') {
      return json({ error: 'userId and name are required' }, { status: 400 });
    }

    const adminCheck = await ensureAdmin(authUser.userId);
    if (!adminCheck.ok) {
      return json(adminCheck.body, { status: adminCheck.status });
    }

    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 64) {
      return json({ error: 'Name must be between 2 and 64 characters' }, { status: 400 });
    }

    const { groups, userGroups } = schema;

    // Case-insensitive uniqueness check
    const existing = await db
      .select()
      .from(groups)
      .where(sql`lower(${groups.name}) = lower(${trimmedName})`)
      .limit(1);
    if (existing.length) {
      return json(
        { error: 'Group name already exists (case-insensitive)' },
        { status: 409 }
      );
    }

    const groupId = crypto.randomUUID();
    const [created] = await db
      .insert(groups)
      .values({
        id: groupId,
        name: trimmedName,
        description: typeof description === 'string' ? description.trim() || null : null,
        createdByUserId: authUser.userId
      })
      .returning();

    // Auto-add creator to the group
    await db.insert(userGroups).values({
      id: crypto.randomUUID(),
      userId: authUser.userId,
      groupId
    });

    return json({ group: created });
  } catch (error) {
    console.error('Error creating group (SvelteKit):', error);
    return json({ error: 'Failed to create group' }, { status: 500 });
  }
};
