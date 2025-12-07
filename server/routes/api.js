import express from 'express';
import path from 'path';
import { eq } from 'drizzle-orm';
import { db, schema } from '../utils/database.js';
import { validateImageWithAI, isSubmissionValid } from '../utils/ai-validator.js';
import { upload, uploadsDir } from '../middleware/upload.js';

const router = express.Router();
const { tasks, submissions } = schema;

// Upload endpoint
router.post('/upload', upload.single('image'), async (req, res) => {
	try {
		if (!req.file) {
			return res.status(400).json({ error: 'No image file provided' });
		}

		const { userId, taskId } = req.body;
		if (!userId || !taskId) {
			return res.status(400).json({ error: 'userId and taskId are required' });
		}

		// Get the task details
		const task = await db
			.select()
			.from(tasks)
			.where(eq(tasks.id, parseInt(taskId)))
			.get();
		if (!task) {
			return res.status(404).json({ error: 'Task not found' });
		}

		// Validate image with AI
		const imagePath = path.join(uploadsDir, req.file.filename);
		const aiResponse = await validateImageWithAI(imagePath, task);
		const valid = isSubmissionValid(aiResponse, task);

		// Store submission in database
		const submissionId = crypto.randomUUID();
		const submission = {
			id: submissionId,
			userId,
			taskId: parseInt(taskId),
			imagePath: `/uploads/${req.file.filename}`,
			aiMatch: aiResponse.match,
			aiConfidence: aiResponse.confidence,
			aiReasoning: aiResponse.reasoning,
			valid,
			submittedAt: new Date()
		};

		await db.insert(submissions).values(submission);

		// Broadcast to all connected clients
		const submissionData = {
			...submission,
			taskDescription: task.description,
			userName: 'Anonymous' // TODO: Get actual user name
		};

		req.io.to('scavenger-hunt').emit('new-submission', submissionData);

		// Return submission data
		res.json({
			success: true,
			submission: {
				...submission,
				aiResponse
			}
		});
	} catch (error) {
		console.error('Upload error:', error);
		res.status(500).json({ error: 'Upload failed' });
	}
});

// Get tasks endpoint
router.get('/tasks', async (req, res) => {
	try {
		const allTasks = await db.select().from(tasks).orderBy(tasks.unlockDate);

		// Add unlocked status based on current date
		const tasksWithStatus = allTasks.map((task) => ({
			...task,
			unlocked: new Date(task.unlockDate) <= new Date()
		}));

		res.json(tasksWithStatus);
	} catch (error) {
		console.error('Error fetching tasks:', error);
		res.status(500).json({ error: 'Failed to fetch tasks' });
	}
});

// Health check endpoint
router.get('/health', (req, res) => {
	res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
