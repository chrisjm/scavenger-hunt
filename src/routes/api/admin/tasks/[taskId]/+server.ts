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

		const taskId = Number(params.taskId);
		if (!Number.isFinite(taskId)) {
			return json({ error: 'Invalid taskId' }, { status: 400 });
		}

		const body = await request.json().catch(() => null);
		const { description, aiPrompt, minConfidence, unlockDate, groupIds } = (body ?? {}) as {
			description?: unknown;
			aiPrompt?: unknown;
			minConfidence?: unknown;
			unlockDate?: unknown;
			groupIds?: unknown;
		};

		if (typeof description !== 'string' || typeof aiPrompt !== 'string') {
			return json({ error: 'description and aiPrompt are required' }, { status: 400 });
		}

		const trimmedDescription = description.trim();
		const trimmedPrompt = aiPrompt.trim();
		if (!trimmedDescription || !trimmedPrompt) {
			return json({ error: 'description and aiPrompt are required' }, { status: 400 });
		}

		const parsedMin =
			typeof minConfidence === 'number'
				? minConfidence
				: typeof minConfidence === 'string'
					? Number(minConfidence)
					: undefined;
		const finalMin = Number.isFinite(parsedMin) ? Number(parsedMin) : 0.7;
		if (finalMin < 0 || finalMin > 1) {
			return json({ error: 'minConfidence must be between 0 and 1' }, { status: 400 });
		}

		const unlock = new Date(typeof unlockDate === 'string' ? unlockDate : '');
		if (!unlockDate || Number.isNaN(unlock.getTime())) {
			return json({ error: 'unlockDate is required and must be a valid date' }, { status: 400 });
		}

		if (!Array.isArray(groupIds) || groupIds.length === 0) {
			return json({ error: 'groupIds is required and must be a non-empty array' }, { status: 400 });
		}

		const validGroupIds = groupIds.filter((id) => typeof id === 'string' && id.trim());
		if (validGroupIds.length === 0) {
			return json({ error: 'At least one valid groupId is required' }, { status: 400 });
		}

		const { tasks, taskGroups } = schema;
		const existing = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
		if (!existing.length) {
			return json({ error: 'Task not found' }, { status: 404 });
		}

		const [updated] = await db
			.update(tasks)
			.set({
				description: trimmedDescription,
				aiPrompt: trimmedPrompt,
				minConfidence: finalMin,
				unlockDate: unlock
			})
			.where(eq(tasks.id, taskId))
			.returning();

		// Replace task-group associations
		await db.delete(taskGroups).where(eq(taskGroups.taskId, taskId));

		const taskGroupValues = validGroupIds.map((groupId) => ({
			taskId,
			groupId: groupId as string
		}));

		await db.insert(taskGroups).values(taskGroupValues);

		return json({ task: updated });
	} catch (error) {
		console.error('Error updating task (admin):', error);
		return json({ error: 'Failed to update task' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
	try {
		const authUser = locals.user;
		if (!authUser) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}
		const adminCheck = await ensureAdmin(authUser.userId);
		if (!adminCheck.ok) {
			return json(adminCheck.body, { status: adminCheck.status });
		}

		const taskId = Number(params.taskId);
		if (!Number.isFinite(taskId)) {
			return json({ error: 'Invalid taskId' }, { status: 400 });
		}

		const { tasks } = schema;
		const existing = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
		if (!existing.length) {
			return json({ error: 'Task not found' }, { status: 404 });
		}

		try {
			await db.delete(tasks).where(eq(tasks.id, taskId));
		} catch (e) {
			if (e instanceof Error && e.message.includes('FOREIGN KEY constraint failed')) {
				return json(
					{ error: 'Task cannot be deleted because it has submissions' },
					{ status: 409 }
				);
			}
			throw e;
		}

		return json({ ok: true });
	} catch (error) {
		console.error('Error deleting task (admin):', error);
		return json({ error: 'Failed to delete task' }, { status: 500 });
	}
};
