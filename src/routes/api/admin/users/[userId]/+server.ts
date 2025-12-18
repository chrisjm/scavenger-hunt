// ABOUTME: Provides admin-only endpoints for managing a specific user's profile.
// ABOUTME: Used by the admin users UI to toggle admin access.

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { eq } from 'drizzle-orm';
import { db, schema } from '$lib/server/db';

async function ensureAdmin(userId: string) {
	const { userProfiles } = schema;
	const rows = await db.select().from(userProfiles).where(eq(userProfiles.id, userId)).limit(1);
	if (!rows.length) return { ok: false, status: 404, body: { error: 'User not found' } } as const;
	if (!rows[0].isAdmin)
		return { ok: false, status: 403, body: { error: 'Admin privileges required' } } as const;
	return { ok: true, user: rows[0] } as const;
}

export const PUT: RequestHandler = async ({ locals, request, params }) => {
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
		const { isAdmin } = (body ?? {}) as { isAdmin?: unknown };
		if (typeof isAdmin !== 'boolean') {
			return json({ error: 'isAdmin is required and must be a boolean' }, { status: 400 });
		}

		if (targetUserId === authUser.userId && adminCheck.user.isAdmin && isAdmin === false) {
			return json({ error: 'You cannot remove your own admin privileges' }, { status: 409 });
		}

		const { userProfiles } = schema;
		const existing = await db
			.select()
			.from(userProfiles)
			.where(eq(userProfiles.id, targetUserId))
			.limit(1);
		if (!existing.length) {
			return json({ error: 'User not found' }, { status: 404 });
		}

		const [updated] = await db
			.update(userProfiles)
			.set({ isAdmin })
			.where(eq(userProfiles.id, targetUserId))
			.returning();

		return json({ user: updated });
	} catch (error) {
		console.error('Error updating user (admin):', error);
		return json({ error: 'Failed to update user' }, { status: 500 });
	}
};
