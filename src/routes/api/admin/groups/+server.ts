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

export const GET: RequestHandler = async ({ locals }) => {
	try {
		const authUser = locals.user;
		if (!authUser) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}
		const adminCheck = await ensureAdmin(authUser.userId);
		if (!adminCheck.ok) {
			return json(adminCheck.body, { status: adminCheck.status });
		}

		const { groups } = schema;
		const rows = await db.select().from(groups).orderBy(groups.createdAt);
		return json({ groups: rows });
	} catch (error) {
		console.error('Error listing groups (admin):', error);
		return json({ error: 'Failed to list groups' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ locals, request }) => {
	try {
		const authUser = locals.user;
		if (!authUser) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}
		const adminCheck = await ensureAdmin(authUser.userId);
		if (!adminCheck.ok) {
			return json(adminCheck.body, { status: adminCheck.status });
		}

		const body = await request.json().catch(() => null);
		const { name, description } = (body ?? {}) as { name?: unknown; description?: unknown };

		if (typeof name !== 'string') {
			return json({ error: 'name is required' }, { status: 400 });
		}
		const trimmedName = name.trim();
		if (trimmedName.length < 2 || trimmedName.length > 64) {
			return json({ error: 'Name must be between 2 and 64 characters' }, { status: 400 });
		}

		const { groups, userGroups } = schema;
		const existing = await db
			.select()
			.from(groups)
			.where(sql`lower(${groups.name}) = lower(${trimmedName})`)
			.limit(1);
		if (existing.length) {
			return json({ error: 'Group name already exists (case-insensitive)' }, { status: 409 });
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

		await db.insert(userGroups).values({
			id: crypto.randomUUID(),
			userId: authUser.userId,
			groupId
		});

		return json({ group: created }, { status: 201 });
	} catch (error) {
		console.error('Error creating group (admin):', error);
		return json({ error: 'Failed to create group' }, { status: 500 });
	}
};

export const PUT: RequestHandler = async ({ locals, request }) => {
	try {
		const authUser = locals.user;
		if (!authUser) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}
		const adminCheck = await ensureAdmin(authUser.userId);
		if (!adminCheck.ok) {
			return json(adminCheck.body, { status: adminCheck.status });
		}

		const body = await request.json().catch(() => null);
		const { groupId, name, description } = (body ?? {}) as {
			groupId?: unknown;
			name?: unknown;
			description?: unknown;
		};

		if (typeof groupId !== 'string') {
			return json({ error: 'groupId is required' }, { status: 400 });
		}
		if (typeof name !== 'string') {
			return json({ error: 'name is required' }, { status: 400 });
		}

		const trimmedName = name.trim();
		if (trimmedName.length < 2 || trimmedName.length > 64) {
			return json({ error: 'Name must be between 2 and 64 characters' }, { status: 400 });
		}

		const { groups } = schema;
		const existing = await db.select().from(groups).where(eq(groups.id, groupId)).limit(1);
		if (!existing.length) {
			return json({ error: 'Group not found' }, { status: 404 });
		}

		const conflict = await db
			.select()
			.from(groups)
			.where(sql`lower(${groups.name}) = lower(${trimmedName})`)
			.limit(1);
		if (conflict.length && conflict[0].id !== groupId) {
			return json({ error: 'Group name already exists (case-insensitive)' }, { status: 409 });
		}

		const [updated] = await db
			.update(groups)
			.set({
				name: trimmedName,
				description: typeof description === 'string' ? description.trim() || null : null
			})
			.where(eq(groups.id, groupId))
			.returning();

		return json({ group: updated });
	} catch (error) {
		console.error('Error updating group (admin):', error);
		return json({ error: 'Failed to update group' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ locals, request }) => {
	try {
		const authUser = locals.user;
		if (!authUser) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}
		const adminCheck = await ensureAdmin(authUser.userId);
		if (!adminCheck.ok) {
			return json(adminCheck.body, { status: adminCheck.status });
		}

		const body = await request.json().catch(() => null);
		const { groupId } = (body ?? {}) as { groupId?: unknown };
		if (typeof groupId !== 'string') {
			return json({ error: 'groupId is required' }, { status: 400 });
		}

		const { groups, submissions } = schema;
		const existing = await db.select().from(groups).where(eq(groups.id, groupId)).limit(1);
		if (!existing.length) {
			return json({ error: 'Group not found' }, { status: 404 });
		}

		const submissionRows = await db
			.select()
			.from(submissions)
			.where(eq(submissions.groupId, groupId))
			.limit(1);
		if (submissionRows.length) {
			return json({ error: 'Group cannot be deleted because it has submissions' }, { status: 409 });
		}

		await db.delete(groups).where(eq(groups.id, groupId));
		return json({ ok: true });
	} catch (error) {
		console.error('Error deleting group (admin):', error);
		return json({ error: 'Failed to delete group' }, { status: 500 });
	}
};
