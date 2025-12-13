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

    const { tasks } = schema;
    const rows = await db.select().from(tasks).orderBy(tasks.unlockDate);
    return json({ tasks: rows });
  } catch (error) {
    console.error('Error listing tasks (admin):', error);
    return json({ error: 'Failed to list tasks' }, { status: 500 });
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
    const { description, aiPrompt, minConfidence, unlockDate } = (body ?? {}) as {
      description?: unknown;
      aiPrompt?: unknown;
      minConfidence?: unknown;
      unlockDate?: unknown;
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

    const { tasks } = schema;
    const [created] = await db
      .insert(tasks)
      .values({
        description: trimmedDescription,
        aiPrompt: trimmedPrompt,
        minConfidence: finalMin,
        unlockDate: unlock
      })
      .returning();

    return json({ task: created }, { status: 201 });
  } catch (error) {
    console.error('Error creating task (admin):', error);
    return json({ error: 'Failed to create task' }, { status: 500 });
  }
};
