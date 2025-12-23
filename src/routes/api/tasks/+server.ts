// ABOUTME: Returns the list of tasks with unlock status for the scavenger hunt.
// ABOUTME: Requires an authenticated session and computes task unlocked flags by date.
// ABOUTME: Filters tasks to only those assigned to groups the user belongs to.

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { eq, inArray } from 'drizzle-orm';
import { db, schema } from '$lib/server/db';

export const GET: RequestHandler = async ({ locals }) => {
	try {
		const authUser = locals.user;
		if (!authUser) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { tasks, taskGroups, userGroups } = schema;

		// Get user's group IDs
		const userGroupRows = await db
			.select({ groupId: userGroups.groupId })
			.from(userGroups)
			.where(eq(userGroups.userId, authUser.userId));

		const userGroupIds = userGroupRows.map((row) => row.groupId);

		// If user is not in any groups, return empty array
		if (userGroupIds.length === 0) {
			return json([]);
		}

		// Get task IDs that belong to user's groups
		const taskGroupRows = await db
			.select({ taskId: taskGroups.taskId })
			.from(taskGroups)
			.where(inArray(taskGroups.groupId, userGroupIds));

		const taskIds = [...new Set(taskGroupRows.map((row) => row.taskId))];

		// If no tasks assigned to user's groups, return empty array
		if (taskIds.length === 0) {
			return json([]);
		}

		// Fetch tasks that belong to user's groups
		const userTasks = await db
			.select()
			.from(tasks)
			.where(inArray(tasks.id, taskIds))
			.orderBy(tasks.unlockDate);

		// Add unlocked status based on current date
		const now = new Date();
		const tasksWithStatus = userTasks.map((task) => ({
			...task,
			unlocked: new Date(task.unlockDate) <= now
		}));

		return json(tasksWithStatus);
	} catch (error) {
		console.error('Error fetching tasks (SvelteKit):', error);
		return json({ error: 'Failed to fetch tasks' }, { status: 500 });
	}
};
