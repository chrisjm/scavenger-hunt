// ABOUTME: Provides admin-only endpoints for managing a user's group memberships.
// ABOUTME: Used by the admin users UI to add/remove users from groups.

import crypto from 'node:crypto';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { and, eq } from 'drizzle-orm';
import { db, schema } from '$lib/server/db';

async function ensureAdmin(userId: string) {
  const { userProfiles } = schema;
  const rows = await db.select().from(userProfiles).where(eq(userProfiles.id, userId)).limit(1);
  if (!rows.length) return { ok: false, status: 404, body: { error: 'User not found' } } as const;
  if (!rows[0].isAdmin)
    return { ok: false, status: 403, body: { error: 'Admin privileges required' } } as const;
  return { ok: true, user: rows[0] } as const;
}

export const GET: RequestHandler = async ({ locals, params }) => {
  try {
    const authUser = locals.user;
    if (!authUser) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }
    const adminCheck = await ensureAdmin(authUser.userId);
    if (!adminCheck.ok) {
      return json(adminCheck.body, { status: adminCheck.status });
    }

    const targetUserId = params.userId;
    if (!targetUserId) {
      return json({ error: 'userId is required' }, { status: 400 });
    }

    const { userProfiles } = schema;
    const targetUser = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.id, targetUserId))
      .limit(1);
    if (!targetUser.length) {
      return json({ error: 'User not found' }, { status: 404 });
    }

    const { groups, userGroups } = schema;
    const rows = await db
      .select({
        id: groups.id,
        name: groups.name,
        description: groups.description,
        joinedAt: userGroups.joinedAt
      })
      .from(userGroups)
      .innerJoin(groups, eq(userGroups.groupId, groups.id))
      .where(eq(userGroups.userId, targetUserId));

    return json({
      groups: rows.map((row) => ({
        ...row,
        joinedAt:
          row.joinedAt instanceof Date
            ? row.joinedAt.toISOString()
            : row.joinedAt != null
              ? new Date(row.joinedAt).toISOString()
              : null
      }))
    });
  } catch (error) {
    console.error('Error listing user groups (admin):', error);
    return json({ error: 'Failed to list user groups' }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ locals, params, request }) => {
  try {
    const authUser = locals.user;
    if (!authUser) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }
    const adminCheck = await ensureAdmin(authUser.userId);
    if (!adminCheck.ok) {
      return json(adminCheck.body, { status: adminCheck.status });
    }

    const targetUserId = params.userId;
    if (!targetUserId) {
      return json({ error: 'userId is required' }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const { groupId } = (body ?? {}) as { groupId?: unknown };
    if (typeof groupId !== 'string' || !groupId) {
      return json({ error: 'groupId is required' }, { status: 400 });
    }

    const { userProfiles, groups, userGroups } = schema;
    const userRows = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.id, targetUserId))
      .limit(1);
    if (!userRows.length) {
      return json({ error: 'User not found' }, { status: 404 });
    }
    const targetIsAdmin = userRows[0].isAdmin ?? false;

    const groupRows = await db.select().from(groups).where(eq(groups.id, groupId)).limit(1);
    if (!groupRows.length) {
      return json({ error: 'Group not found' }, { status: 404 });
    }

    const existing = await db
      .select()
      .from(userGroups)
      .where(and(eq(userGroups.userId, targetUserId), eq(userGroups.groupId, groupId)))
      .limit(1);
    if (existing.length) {
      return json({ error: 'User is already a member of this group' }, { status: 409 });
    }

    if (!targetIsAdmin) {
      const existingMembership = await db
        .select()
        .from(userGroups)
        .where(eq(userGroups.userId, targetUserId))
        .limit(1);
      if (existingMembership.length) {
        return json({ error: 'User can only be a member of one group' }, { status: 409 });
      }
    }

    await db.insert(userGroups).values({
      id: crypto.randomUUID(),
      userId: targetUserId,
      groupId
    });

    return json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error('Error adding user to group (admin):', error);
    return json({ error: 'Failed to add user to group' }, { status: 500 });
  }
};

export const DELETE: RequestHandler = async ({ locals, params, request }) => {
  try {
    const authUser = locals.user;
    if (!authUser) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }
    const adminCheck = await ensureAdmin(authUser.userId);
    if (!adminCheck.ok) {
      return json(adminCheck.body, { status: adminCheck.status });
    }

    const targetUserId = params.userId;
    if (!targetUserId) {
      return json({ error: 'userId is required' }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const { groupId } = (body ?? {}) as { groupId?: unknown };
    if (typeof groupId !== 'string' || !groupId) {
      return json({ error: 'groupId is required' }, { status: 400 });
    }

    const { userGroups } = schema;
    const existing = await db
      .select()
      .from(userGroups)
      .where(and(eq(userGroups.userId, targetUserId), eq(userGroups.groupId, groupId)))
      .limit(1);
    if (!existing.length) {
      return json({ error: 'Membership not found' }, { status: 404 });
    }

    await db
      .delete(userGroups)
      .where(and(eq(userGroups.userId, targetUserId), eq(userGroups.groupId, groupId)));

    return json({ ok: true });
  } catch (error) {
    console.error('Error removing user from group (admin):', error);
    return json({ error: 'Failed to remove user from group' }, { status: 500 });
  }
};
