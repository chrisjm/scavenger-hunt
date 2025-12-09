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

// GET /api/submissions/user/:userId - Get submissions for a specific user
router.get('/user/:userId', async (req, res) => {
	try {
		// Enforce that users can only retrieve their own submissions unless expanded later
		const userId = req.user?.userId;

		const userSubmissions = await db
			.select({
				id: submissions.id,
				taskId: submissions.taskId,
				valid: submissions.valid,
				submittedAt: submissions.submittedAt,
				taskDescription: tasks.description
			})
			.from(submissions)
			.innerJoin(tasks, eq(submissions.taskId, tasks.id))
			.where(eq(submissions.userId, userId))
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
