// ABOUTME: Centralizes group membership checks for server-side routes.
// ABOUTME: Used to ensure group-scoped endpoints only return data to members (or admins).

import { and, eq } from 'drizzle-orm';
import { db, schema } from '$lib/server/db';

export async function ensureGroupAccess({
	userId,
	isAdmin,
	groupId
}: {
	userId: string | null | undefined;
	isAdmin: boolean;
	groupId: string;
}): Promise<boolean> {
	if (isAdmin) return true;
	if (!userId) return false;

	const { userGroups } = schema;
	const membership = await db
		.select()
		.from(userGroups)
		.where(and(eq(userGroups.userId, userId), eq(userGroups.groupId, groupId)))
		.get();

	return Boolean(membership);
}
