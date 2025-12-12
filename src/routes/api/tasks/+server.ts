// ABOUTME: Returns the list of tasks with unlock status for the scavenger hunt.
// ABOUTME: Requires an authenticated session and computes task unlocked flags by date.

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, schema } from '$lib/server/db';

export const GET: RequestHandler = async ({ locals }) => {
	try {
		const authUser = locals.user;
		if (!authUser) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { tasks } = schema;
		const allTasks = await db.select().from(tasks).orderBy(tasks.unlockDate);

		// Add unlocked status based on current date
		const now = new Date();
		const tasksWithStatus = allTasks.map((task) => ({
			...task,
			unlocked: new Date(task.unlockDate) <= now
		}));

		return json(tasksWithStatus);
	} catch (error) {
		console.error('Error fetching tasks (SvelteKit):', error);
		return json({ error: 'Failed to fetch tasks' }, { status: 500 });
	}
};
