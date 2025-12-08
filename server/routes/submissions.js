import express from 'express';
import path from 'path';
import { eq, desc, count } from 'drizzle-orm';
import { db, schema } from '../utils/database.js';
import { validateImageWithAI, isSubmissionValid } from '../utils/ai-validator.js';

const router = express.Router();
const { tasks, submissions, users, photos } = schema;

// POST /api/submissions
router.post('/', async (req, res) => {
	try {
		const { userId, taskId, photoId } = req.body;

		// 1. Validate inputs
		if (!userId || !taskId || !photoId) {
			return res.status(400).json({ error: 'Missing required fields' });
		}

		// 2. Fetch Context (Photo & Task)
		const photo = await db.select().from(photos).where(eq(photos.id, photoId)).get();
		const task = await db.select().from(tasks).where(eq(tasks.id, taskId)).get();
		const user = await db.select().from(users).where(eq(users.id, userId)).get();

		if (!photo) return res.status(404).json({ error: 'Photo not found' });
		if (!task) return res.status(404).json({ error: 'Task not found' });

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
				imagePath: photo.filePath
			});
		}

		res.json({ success: true, submission });
	} catch (error) {
		console.error('Submission error:', error);
		res.status(500).json({ error: 'Submission processing failed' });
	}
});

// GET /api/submissions - Get all submissions for the feed
router.get('/', async (req, res) => {
	try {
		const allSubmissions = await db
			.select({
				id: submissions.id,
				userId: submissions.userId,
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
		const { userId } = req.params;

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

// GET /api/submissions/leaderboard
router.get('/leaderboard', async (req, res) => {
	try {
		const leaderboard = await db
			.select({
				name: users.name,
				score: count(submissions.id)
			})
			.from(submissions)
			.innerJoin(users, eq(submissions.userId, users.id))
			.where(eq(submissions.valid, 1))
			.groupBy(users.name)
			.orderBy(desc(count(submissions.id)));

		res.json(leaderboard);
	} catch (error) {
		console.error('Error fetching leaderboard:', error);
		res.status(500).json({ error: 'Failed to fetch leaderboard' });
	}
});

export default router;
