// ABOUTME: Provides CRUD-style APIs for submission reactions with access control and auditing.
// ABOUTME: Returns detailed reaction breakdowns grouped by emoji for frontend consumption.

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { asc, eq } from 'drizzle-orm';
import { db, schema } from '$lib/server/db';
import { ensureGroupAccess } from '$lib/server/groupAccess';
import {
	addReaction,
	removeReaction,
	REACTION_EMOJIS
} from '$lib/server/reactions/reactionService';

const MAX_REACTOR_LIST = 25;

const { submissions, userProfiles, photos, tasks, submissionReactions } = schema;

async function loadSubmissionWithAccess(
	submissionId: string,
	userId: string | null,
	isAdmin: boolean
) {
	const submission = await db
		.select({
			id: submissions.id,
			groupId: submissions.groupId,
			userId: submissions.userId,
			userName: userProfiles.displayName,
			taskDescription: tasks.description,
			imagePath: photos.filePath,
			valid: submissions.valid,
			submittedAt: submissions.submittedAt
		})
		.from(submissions)
		.where(eq(submissions.id, submissionId))
		.innerJoin(userProfiles, eq(submissions.userId, userProfiles.id))
		.innerJoin(tasks, eq(submissions.taskId, tasks.id))
		.innerJoin(photos, eq(submissions.photoId, photos.id))
		.get();

	if (!submission) {
		return { error: json({ error: 'Submission not found' }, { status: 404 }) };
	}

	const hasAccess = await ensureGroupAccess({
		userId,
		isAdmin: Boolean(isAdmin),
		groupId: submission.groupId
	});

	if (!hasAccess) {
		return { error: json({ error: 'Forbidden' }, { status: 403 }) };
	}

	return { submission };
}

async function buildReactionDetail(submissionId: string, viewerId: string | null) {
	const rows = await db
		.select({
			emoji: submissionReactions.emoji,
			userId: submissionReactions.userId,
			displayName: userProfiles.displayName,
			reactedAt: submissionReactions.createdAt
		})
		.from(submissionReactions)
		.innerJoin(userProfiles, eq(submissionReactions.userId, userProfiles.id))
		.where(eq(submissionReactions.submissionId, submissionId))
		.orderBy(asc(submissionReactions.emoji), asc(submissionReactions.createdAt));

	const grouped = new Map<
		string,
		{
			emoji: string;
			count: number;
			reactors: { userId: string; displayName: string; reactedAt: number | Date | null }[];
			viewerHasReacted: boolean;
		}
	>();
	const viewerReactions = new Set<string>();

	for (const row of rows) {
		if (!grouped.has(row.emoji)) {
			grouped.set(row.emoji, {
				emoji: row.emoji,
				count: 0,
				reactors: [],
				viewerHasReacted: false
			});
		}

		const entry = grouped.get(row.emoji)!;
		entry.count += 1;
		if (entry.reactors.length < MAX_REACTOR_LIST) {
			entry.reactors.push({
				userId: row.userId,
				displayName: row.displayName ?? 'Unknown',
				reactedAt: row.reactedAt ?? null
			});
		}

		if (viewerId && row.userId === viewerId) {
			entry.viewerHasReacted = true;
			viewerReactions.add(row.emoji);
		}
	}

	return {
		reactions: Array.from(grouped.values()),
		viewerReactions: Array.from(viewerReactions)
	};
}

export const GET: RequestHandler = async ({ params, locals }) => {
	try {
		const authUser = locals.user;
		if (!authUser) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const submissionId = params.id;
		const { submission, error } = await loadSubmissionWithAccess(
			submissionId,
			authUser.userId,
			Boolean(authUser.isAdmin)
		);
		if (error || !submission) return error;

		const detail = await buildReactionDetail(submissionId, authUser.userId);

		return json({
			submission,
			...detail,
			availableEmojis: REACTION_EMOJIS
		});
	} catch (err) {
		console.error('Error fetching reactions detail:', err);
		return json({ error: 'Failed to fetch reactions' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ params, request, locals }) => {
	try {
		const authUser = locals.user;
		if (!authUser) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}
		const submissionId = params.id;
		const { submission, error } = await loadSubmissionWithAccess(
			submissionId,
			authUser.userId,
			Boolean(authUser.isAdmin)
		);
		if (error || !submission) return error;

		const body = await request.json().catch(() => null);
		const emoji = typeof body?.emoji === 'string' ? body.emoji : null;
		if (!emoji) {
			return json({ error: 'emoji is required' }, { status: 400 });
		}

		await addReaction({ submissionId, userId: authUser.userId!, emoji }, { db });

		const detail = await buildReactionDetail(submissionId, authUser.userId);
		return json({ success: true, ...detail });
	} catch (err) {
		console.error('Error adding reaction:', err);
		return json({ error: 'Failed to add reaction' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params, request, locals }) => {
	try {
		const authUser = locals.user;
		if (!authUser) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}
		const submissionId = params.id;
		const { submission, error } = await loadSubmissionWithAccess(
			submissionId,
			authUser.userId,
			Boolean(authUser.isAdmin)
		);
		if (error || !submission) return error;

		const body = await request.json().catch(() => null);
		const emoji = typeof body?.emoji === 'string' ? body.emoji : null;
		if (!emoji) {
			return json({ error: 'emoji is required' }, { status: 400 });
		}

		await removeReaction({ submissionId, userId: authUser.userId!, emoji }, { db });

		const detail = await buildReactionDetail(submissionId, authUser.userId);
		return json({ success: true, ...detail });
	} catch (err) {
		console.error('Error removing reaction:', err);
		return json({ error: 'Failed to remove reaction' }, { status: 500 });
	}
};
