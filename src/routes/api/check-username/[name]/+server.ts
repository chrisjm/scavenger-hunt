import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { eq } from 'drizzle-orm';
import { db, schema } from '$lib/server/db';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const rawName = params.name;

		if (!rawName || rawName.trim().length === 0) {
			return json({ error: 'Username is required' }, { status: 400 });
		}

		const trimmed = rawName.trim();
		const username = trimmed.toLowerCase();

		if (username.length < 2 || username.length > 30) {
			return json(
				{
					available: false,
					error: 'Username must be between 2 and 30 characters'
				},
				{ status: 400 }
			);
		}

		const { authUsers } = schema;
		const rows = await db.select().from(authUsers).where(eq(authUsers.username, username)).limit(1);

		return json({
			available: rows.length === 0,
			username
		});
	} catch (error) {
		console.error('Username check error (SvelteKit):', error);
		return json({ error: 'Failed to check username availability' }, { status: 500 });
	}
};
