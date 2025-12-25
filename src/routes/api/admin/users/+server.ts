// ABOUTME: Provides admin-only endpoints for listing and managing user profiles.
// ABOUTME: Used by the admin dashboard to view users and adjust permissions.

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

		const { userProfiles, userGroups, groups } = schema;
		const rows = await db.select().from(userProfiles).orderBy(userProfiles.createdAt);

		const membershipRows = await db
			.select({
				userId: userGroups.userId,
				groupId: userGroups.groupId,
				groupName: groups.name,
				joinedAt: userGroups.joinedAt
			})
			.from(userGroups)
			.innerJoin(groups, eq(userGroups.groupId, groups.id));

		const primaryGroupByUserId = new Map<
			string,
			{ id: string; name: string; joinedAtMs: number }
		>();
		for (const membership of membershipRows) {
			const joinedAtMs =
				membership.joinedAt instanceof Date
					? membership.joinedAt.getTime()
					: typeof membership.joinedAt === 'number'
						? membership.joinedAt
						: membership.joinedAt
							? new Date(membership.joinedAt).getTime()
							: 0;
			const existing = primaryGroupByUserId.get(membership.userId);
			if (!existing || joinedAtMs < existing.joinedAtMs) {
				primaryGroupByUserId.set(membership.userId, {
					id: membership.groupId,
					name: membership.groupName,
					joinedAtMs
				});
			}
		}

		const authUsers = await db.select().from(schema.authUsers);
		const authIdByProfileId = new Map<string, string>();
		for (const row of authUsers) {
			authIdByProfileId.set(row.profileId, row.id);
		}

		const sessions = await db.select().from(schema.sessions);
		const lastLoginByAuthId = new Map<string, Date>();
		for (const session of sessions) {
			const existing = lastLoginByAuthId.get(session.userId);
			const createdAt =
				session.createdAt instanceof Date ? session.createdAt : new Date(session.createdAt);
			if (!existing || createdAt.getTime() > existing.getTime()) {
				lastLoginByAuthId.set(session.userId, createdAt);
			}
		}

		const users = rows.map((row) => {
			const authId = authIdByProfileId.get(row.id);
			const lastLoginAt = authId ? lastLoginByAuthId.get(authId) : undefined;
			const primaryGroup = primaryGroupByUserId.get(row.id);

			return {
				id: row.id,
				displayName: row.displayName,
				isAdmin: row.isAdmin,
				createdAt:
					row.createdAt instanceof Date
						? row.createdAt.toISOString()
						: new Date(row.createdAt as unknown as number).toISOString(),
				lastLoginAt: lastLoginAt ? lastLoginAt.toISOString() : null,
				currentGroup: primaryGroup
					? {
							id: primaryGroup.id,
							name: primaryGroup.name
						}
					: null
			};
		});

		return json({ users });
	} catch (error) {
		console.error('Error listing users (admin):', error);
		return json({ error: 'Failed to list users' }, { status: 500 });
	}
};
