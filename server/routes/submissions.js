import express from 'express';
import path from 'path';
import { eq, desc, count, and } from 'drizzle-orm';
import { db, schema } from '../utils/database.js';
import { validateImageWithAI, isSubmissionValid } from '../utils/ai-validator.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);
const { tasks, submissions, users, photos, userGroups } = schema;

// POST /api/submissions
router.post('/', async (req, res) => {
	try {
		const { taskId, photoId, groupId } = req.body;
		const userId = req.user?.userId;

		// 1. Validate inputs
		if (!userId || !taskId || !photoId || !groupId) {
			return res.status(400).json({ error: 'Missing required fields' });
		}

		// 2. Fetch Context (Photo & Task)
		const photo = await db.select().from(photos).where(eq(photos.id, photoId)).get();
		const task = await db.select().from(tasks).where(eq(tasks.id, taskId)).get();
		const user = await db.select().from(users).where(eq(users.id, userId)).get();
		const membership = await db
			.select()
			.from(userGroups)
			.where(and(eq(userGroups.userId, userId), eq(userGroups.groupId, groupId)))
			.get();

		if (!photo) return res.status(404).json({ error: 'Photo not found' });
		if (!task) return res.status(404).json({ error: 'Task not found' });
		if (!membership) return res.status(403).json({ error: 'User is not a member of this group' });

		// Security check: Ensure user owns the photo they are submitting
		if (photo.userId !== userId) {
			return res.status(403).json({ error: 'You do not own this photo' });
		}

		// 3. AI Validation
		// Construct absolute path for the AI validator
		const absolutePath = path.join(process.cwd(), photo.filePath);

		let aiResponse;
		try {
			aiResponse = await validateImageWithAI(absolutePath, task);
		} catch (aiError) {
			console.error('AI validation failed:', aiError);
			return res.status(500).json({ error: 'AI validation failed' });
		}
		const valid = isSubmissionValid(aiResponse, task);

		// 4. Record Submission
		await db
			.delete(submissions)
			.where(
				and(
					and(eq(submissions.userId, userId), eq(submissions.taskId, taskId)),
					eq(submissions.groupId, groupId)
				)
			);

		const [submission] = await db
			.insert(submissions)
			.values({
				userId,
				groupId,
				taskId,
				photoId,
				aiMatch: aiResponse.match,
				aiConfidence: aiResponse.confidence,
				aiReasoning: aiResponse.reasoning,
				valid
			})
			.returning();

		// 5. Broadcast (Socket.io)
		if (req.io) {
			req.io.to('scavenger-hunt').emit('new-submission', {
				...submission,
				taskDescription: task.description,
				userName: user.name,
				groupId,
				imagePath: photo.filePath
			});
		}

		res.json({ success: true, submission });
	} catch (error) {
		console.error('Submission error:', error);
		res.status(500).json({ error: 'Submission processing failed' });
	}
});

// GET /api/submissions - Get submissions for a group feed (group-only)
router.get('/', async (req, res) => {
	try {
		const { groupId } = req.query;
		if (!groupId || typeof groupId !== 'string') {
			return res.status(400).json({ error: 'groupId is required' });
		}

		const allSubmissions = await db
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
				userName: users.name,
				imagePath: photos.filePath
			})
			.from(submissions)
			.innerJoin(tasks, eq(submissions.taskId, tasks.id))
			.innerJoin(users, eq(submissions.userId, users.id))
			.innerJoin(photos, eq(submissions.photoId, photos.id))
			.where(and(eq(submissions.aiMatch, 1), eq(submissions.groupId, groupId)))
			.orderBy(desc(submissions.submittedAt));

		res.json(allSubmissions);
	} catch (error) {
		console.error('Error fetching submissions:', error);
		res.status(500).json({ error: 'Failed to fetch submissions' });
	}
});

// GET /api/submissions/all - Get submissions for a group
// - Admins: all submissions in the group
// - Regular users: only their own submissions in the group
router.get('/all', async (req, res) => {
	try {
		const authUserId = req.user?.userId;
		const isAdmin = req.user?.isAdmin;

		const { groupId } = req.query;
		if (!groupId || typeof groupId !== 'string') {
			return res.status(400).json({ error: 'groupId is required' });
		}

		const conditions = [eq(submissions.groupId, groupId)];
		// If not admin, constrain to the authenticated user's submissions
		if (!isAdmin && authUserId) {
			conditions.push(eq(submissions.userId, authUserId));
		}

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
				userName: users.name,
				imagePath: photos.filePath
			})
			.from(submissions)
			.innerJoin(tasks, eq(submissions.taskId, tasks.id))
			.innerJoin(users, eq(submissions.userId, users.id))
			.innerJoin(photos, eq(submissions.photoId, photos.id))
			.where(and(...conditions))
			.orderBy(desc(submissions.submittedAt));

		res.json(scopedSubmissions);
	} catch (error) {
		console.error('Error fetching all group submissions:', error);
		res.status(500).json({ error: 'Failed to fetch all group submissions' });
	}
});

// GET /api/submissions/user/:userId - Admin-only: get submissions for a specific user (optionally scoped to a group)
router.get('/user/:userId', async (req, res) => {
	try {
		const isAdmin = req.user?.isAdmin;
		if (!isAdmin) {
			return res.status(403).json({ error: 'Forbidden: admin access required' });
		}

		const { userId } = req.params;
		const { groupId } = req.query;
		if (!userId) {
			return res.status(400).json({ error: 'userId is required' });
		}

		const conditions = [eq(submissions.userId, userId)];
		if (groupId && typeof groupId === 'string') {
			conditions.push(eq(submissions.groupId, groupId));
		}

		const userSubmissions = await db
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
				userName: users.name,
				imagePath: photos.filePath
			})
			.from(submissions)
			.innerJoin(tasks, eq(submissions.taskId, tasks.id))
			.innerJoin(users, eq(submissions.userId, users.id))
			.innerJoin(photos, eq(submissions.photoId, photos.id))
			.where(and(...conditions))
			.orderBy(desc(submissions.submittedAt));

		res.json(userSubmissions);
	} catch (error) {
		console.error('Error fetching user submissions:', error);
		res.status(500).json({ error: 'Failed to fetch user submissions' });
	}
});

// GET /api/submissions/leaderboard - group-only
router.get('/leaderboard', async (req, res) => {
	try {
		const { groupId } = req.query;
		if (!groupId || typeof groupId !== 'string') {
			return res.status(400).json({ error: 'groupId is required' });
		}

		const leaderboard = await db
			.select({
				name: users.name,
				score: count(submissions.id)
			})
			.from(submissions)
			.innerJoin(users, eq(submissions.userId, users.id))
			.where(and(eq(submissions.valid, 1), eq(submissions.groupId, groupId)))
			.groupBy(users.name)
			.orderBy(desc(count(submissions.id)));

		res.json(leaderboard);
	} catch (error) {
		console.error('Error fetching leaderboard:', error);
		res.status(500).json({ error: 'Failed to fetch leaderboard' });
	}
});

// DELETE /api/submissions/:id - Delete a user's submission
router.delete('/:id', async (req, res) => {
	try {
		const { id } = req.params;
		const userId = req.user?.userId;

		if (!userId) {
			return res.status(400).json({ error: 'User ID is required' });
		}

		// First, verify the submission exists and belongs to the user
		const submission = await db.select().from(submissions).where(eq(submissions.id, id)).get();

		if (!submission) {
			return res.status(404).json({ error: 'Submission not found' });
		}

		if (submission.userId !== userId) {
			return res.status(403).json({ error: 'You can only delete your own submissions' });
		}

		// Delete the submission
		await db.delete(submissions).where(eq(submissions.id, id));

		// Broadcast the deletion via socket
		if (req.io) {
			req.io.to('scavenger-hunt').emit('submission-deleted', {
				submissionId: id,
				taskId: submission.taskId,
				userId: submission.userId
			});
		}

		res.json({ success: true, message: 'Submission deleted successfully' });
	} catch (error) {
		console.error('Error deleting submission:', error);
		res.status(500).json({ error: 'Failed to delete submission' });
	}
});

export default router;
