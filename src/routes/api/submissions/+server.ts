// ABOUTME: Handles creation of submissions and group-scoped submission feed for the scavenger hunt.
// ABOUTME: Uses AI validation and S3-backed photos while enforcing group membership and ownership.

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { and, eq, desc, sql, inArray, asc } from 'drizzle-orm';
import { db, schema } from '$lib/server/db';
import { ensureGroupAccess } from '$lib/server/groupAccess';
import { extractKeyFromUrl, fetchObjectBuffer } from '$lib/utils/s3';
import { validateImageWithAI, isSubmissionValid } from '$lib/utils/aiValidator';
import { REACTION_EMOJIS } from '$lib/server/reactions/reactionService';
import {
	parseScoreBreakdown,
	normalizeSubmissionRow
} from '$lib/server/submissions/scoring';

const MAX_INLINE_REACTORS = 3;

async function attachReactionSummaries<
	T extends {
		id: string;
	}
>(submissionsList: T[], viewerId: string | null) {
	const submissionIds = submissionsList.map((submission) => submission.id);
	if (submissionIds.length === 0) {
		return submissionsList.map((submission) => ({
			...submission,
			reactions: [],
			viewerReactionEmojis: [],
			availableReactionEmojis: REACTION_EMOJIS
		}));
	}

	const { submissionReactions, userProfiles } = schema;

	const reactionRows = await db
		.select({
			submissionId: submissionReactions.submissionId,
			emoji: submissionReactions.emoji,
			userId: submissionReactions.userId,
			displayName: userProfiles.displayName,
			reactedAt: submissionReactions.createdAt
		})
		.from(submissionReactions)
		.innerJoin(userProfiles, eq(submissionReactions.userId, userProfiles.id))
		.where(inArray(submissionReactions.submissionId, submissionIds))
		.orderBy(
			asc(submissionReactions.submissionId),
			asc(submissionReactions.emoji),
			asc(submissionReactions.createdAt)
		);

	const aggregates = new Map<
		string,
		{
			reactionMap: Map<
				string,
				{
					emoji: string;
					count: number;
					viewerHasReacted: boolean;
					sampleReactors: {
						userId: string;
						displayName: string;
						reactedAt: number | Date | null;
					}[];
				}
			>;
			viewerSet: Set<string>;
		}
	>();

	for (const row of reactionRows) {
		if (!aggregates.has(row.submissionId)) {
			aggregates.set(row.submissionId, {
				reactionMap: new Map(),
				viewerSet: new Set()
			});
		}

		const entry = aggregates.get(row.submissionId)!;
		if (!entry.reactionMap.has(row.emoji)) {
			entry.reactionMap.set(row.emoji, {
				emoji: row.emoji,
				count: 0,
				viewerHasReacted: false,
				sampleReactors: []
			});
		}

		const summary = entry.reactionMap.get(row.emoji)!;
		summary.count += 1;
		if (summary.sampleReactors.length < MAX_INLINE_REACTORS) {
			summary.sampleReactors.push({
				userId: row.userId,
				displayName: row.displayName ?? 'Unknown player',
				reactedAt: row.reactedAt ?? null
			});
		}

		if (viewerId && row.userId === viewerId) {
			summary.viewerHasReacted = true;
			entry.viewerSet.add(row.emoji);
		}
	}

	return submissionsList.map((submission) => {
		const entry = aggregates.get(submission.id);
		return {
			...submission,
			reactions: entry ? Array.from(entry.reactionMap.values()) : [],
			viewerReactionEmojis: entry ? Array.from(entry.viewerSet) : [],
			availableReactionEmojis: REACTION_EMOJIS
		};
	});
}

// POST /api/submissions
export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const authUser = locals.user;
		if (!authUser) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const body = await request.json().catch(() => null);
		const { taskId, photoId, groupId } = (body ?? {}) as {
			userId?: unknown;
			groupId?: unknown;
			photoId?: unknown;
			taskId?: unknown;
		};

		const userId = authUser.userId;

		// 1. Validate inputs
		if (
			!userId ||
			typeof taskId !== 'number' ||
			typeof photoId !== 'string' ||
			typeof groupId !== 'string'
		) {
			return json({ error: 'Missing required fields' }, { status: 400 });
		}

		const { tasks, submissions, photos, userGroups, taskGroups } = schema;

		// 2. Fetch context (Photo & Task & membership)
		const photo = await db.select().from(photos).where(eq(photos.id, photoId)).get();
		const task = await db.select().from(tasks).where(eq(tasks.id, taskId)).get();
		const membership = await db
			.select()
			.from(userGroups)
			.where(and(eq(userGroups.userId, userId), eq(userGroups.groupId, groupId)))
			.get();

		if (!photo) return json({ error: 'Photo not found' }, { status: 404 });
		if (!task) return json({ error: 'Task not found' }, { status: 404 });
		if (!membership) return json({ error: 'User is not a member of this group' }, { status: 403 });

		// Verify task is assigned to this group
		const taskGroupAssignment = await db
			.select()
			.from(taskGroups)
			.where(and(eq(taskGroups.taskId, taskId), eq(taskGroups.groupId, groupId)))
			.get();

		if (!taskGroupAssignment) {
			return json({ error: 'Task is not available for this group' }, { status: 400 });
		}

		// Security check: Ensure user owns the photo they are submitting
		if (photo.userId !== userId) {
			return json({ error: 'You do not own this photo' }, { status: 403 });
		}

		// 3. AI Validation (fetch from S3)
		const photoKey = extractKeyFromUrl(photo.filePath);
		let aiResponse;
		try {
			const photoBuffer = await fetchObjectBuffer(photoKey);
			aiResponse = await validateImageWithAI(photoBuffer, task);
		} catch (aiError) {
			console.error('AI validation failed:', aiError);
			return json({ error: 'AI validation failed' }, { status: 500 });
		}
		const valid = isSubmissionValid(aiResponse);

		// 4. Record submission (keep history)
		const [submission] = await db
			.insert(submissions)
			.values({
				userId,
				groupId,
				taskId,
				photoId,
				aiMatch: valid,
				aiConfidence: null,
				aiReasoning: aiResponse.aiComment,
				totalScore: aiResponse.totalScore,
				scoreBreakdown: JSON.stringify(aiResponse.breakdown),
				aiComment: aiResponse.aiComment,
				valid
			})
			.returning();

		return json({ success: true, submission });
	} catch (error) {
		console.error('Submission error (SvelteKit):', error);
		return json({ error: 'Submission processing failed' }, { status: 500 });
	}
};

// GET /api/submissions - group feed (valid submissions only)
export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		const authUser = locals.user;
		if (!authUser) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const groupId = url.searchParams.get('groupId');
		if (!groupId) {
			return json({ error: 'groupId is required' }, { status: 400 });
		}

		const hasAccess = await ensureGroupAccess({
			userId: authUser.userId,
			isAdmin: authUser.isAdmin,
			groupId
		});
		if (!hasAccess) {
			return json({ error: 'User is not a member of this group' }, { status: 403 });
		}

		const { tasks, submissions, userProfiles, photos } = schema;

		const submissionsQuery = await db
			.select({
				id: submissions.id,
				userId: submissions.userId,
				groupId: submissions.groupId,
				taskId: submissions.taskId,
				photoId: submissions.photoId,
				aiMatch: submissions.aiMatch,
				aiConfidence: submissions.aiConfidence,
				aiReasoning: submissions.aiReasoning,
				valid: submissions.valid,
				submittedAt: submissions.submittedAt,
				taskDescription: tasks.description,
				userName: userProfiles.displayName,
				imagePath: photos.filePath
			})
			.from(submissions)
			.innerJoin(tasks, eq(submissions.taskId, tasks.id))
			.innerJoin(userProfiles, eq(submissions.userId, userProfiles.id))
			.innerJoin(photos, eq(submissions.photoId, photos.id))
			.where(eq(submissions.groupId, groupId))
			.orderBy(desc(submissions.submittedAt));

		const hydrated = await attachReactionSummaries(submissionsQuery, authUser.userId);

		return json(hydrated);
	} catch (error) {
		console.error('Error fetching submissions (SvelteKit):', error);
		return json({ error: 'Failed to fetch submissions' }, { status: 500 });
	}
};

// GET /api/submissions/all - scoped submissions for a group (admin vs non-admin)
export const _GET_all: RequestHandler = async ({ url, locals }) => {
	try {
		const authUser = locals.user;
		if (!authUser) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const groupId = url.searchParams.get('groupId');
		if (!groupId) {
			return json({ error: 'groupId is required' }, { status: 400 });
		}

		const hasAccess = await ensureGroupAccess({
			userId: authUser.userId,
			isAdmin: authUser.isAdmin,
			groupId
		});
		if (!hasAccess) {
			return json({ error: 'User is not a member of this group' }, { status: 403 });
		}

		const { tasks, submissions, userProfiles, photos } = schema;

		const scopedSubmissions = await db
			.select({
				id: submissions.id,
				userId: submissions.userId,
				groupId: submissions.groupId,
				taskId: submissions.taskId,
				photoId: submissions.photoId,
				aiMatch: submissions.aiMatch,
				aiConfidence: submissions.aiConfidence,
				aiReasoning: submissions.aiReasoning,
				valid: submissions.valid,
				submittedAt: submissions.submittedAt,
				taskDescription: tasks.description,
				userName: userProfiles.displayName,
				imagePath: photos.filePath
			})
			.from(submissions)
			.innerJoin(tasks, eq(submissions.taskId, tasks.id))
			.innerJoin(userProfiles, eq(submissions.userId, userProfiles.id))
			.innerJoin(photos, eq(submissions.photoId, photos.id))
			.where(eq(submissions.groupId, groupId))
			.orderBy(desc(submissions.submittedAt));

		const hydrated = await attachReactionSummaries(scopedSubmissions, authUser.userId);

		return json(hydrated);
	} catch (error) {
		console.error('Error fetching all group submissions (SvelteKit):', error);
		return json({ error: 'Failed to fetch all group submissions' }, { status: 500 });
	}
};

// GET /api/submissions/leaderboard - group-only leaderboard
export const _GET_leaderboard: RequestHandler = async ({ url, locals }) => {
	try {
		const authUser = locals.user;
		if (!authUser) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const groupId = url.searchParams.get('groupId');
		if (!groupId) {
			return json({ error: 'groupId is required' }, { status: 400 });
		}

		const hasAccess = await ensureGroupAccess({
			userId: authUser.userId,
			isAdmin: authUser.isAdmin,
			groupId
		});
		if (!hasAccess) {
			return json({ error: 'User is not a member of this group' }, { status: 403 });
		}

		const { submissions, userProfiles } = schema;
		const score = sql<number>`count(distinct ${submissions.taskId})`;

		const leaderboard = await db
			.select({
				name: userProfiles.displayName,
				score
			})
			.from(submissions)
			.innerJoin(userProfiles, eq(submissions.userId, userProfiles.id))
			.where(and(eq(submissions.valid, true), eq(submissions.groupId, groupId)))
			.groupBy(userProfiles.id, userProfiles.displayName)
			.orderBy(desc(score));

		return json(leaderboard);
	} catch (error) {
		console.error('Error fetching leaderboard (SvelteKit):', error);
		return json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
	}
};
