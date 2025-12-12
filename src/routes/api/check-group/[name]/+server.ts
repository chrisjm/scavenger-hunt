// ABOUTME: Checks whether a group exists by name using a case-insensitive lookup.
// ABOUTME: Used for onboarding flows where users enter a group name to join.

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sql } from 'drizzle-orm';
import { db, schema } from '$lib/server/db';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const rawName = params.name;

		if (!rawName || rawName.trim().length === 0) {
			return json({ error: 'Group name is required' }, { status: 400 });
		}

		const trimmedName = rawName.trim();

		if (trimmedName.length < 2 || trimmedName.length > 64) {
			return json(
				{
					exists: false,
					error: 'Group name must be between 2 and 64 characters'
				},
				{ status: 400 }
			);
		}

		const { groups } = schema;
		const existingGroup = await db
			.select()
			.from(groups)
			.where(sql`lower(${groups.name}) = lower(${trimmedName})`)
			.limit(1);

		if (!existingGroup.length) {
			return json({ exists: false, name: trimmedName });
		}

		const group = existingGroup[0];
		return json({ exists: true, name: group.name, id: group.id });
	} catch (error) {
		console.error('Group check error (SvelteKit):', error);
		return json({ error: 'Failed to check group' }, { status: 500 });
	}
};
