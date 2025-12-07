import express from 'express';
import path from 'path';
import { eq, count, desc } from 'drizzle-orm';
import { db, schema } from '../utils/database.js';
import { validateImageWithAI, isSubmissionValid } from '../utils/ai-validator.js';
import { upload, uploadsDir } from '../middleware/upload.js';

const router = express.Router();
const { tasks, submissions, users } = schema;

// Login endpoint - creates or retrieves user
router.post('/login', async (req, res) => {
	try {
		const { name } = req.body;
		if (!name || typeof name !== 'string' || name.trim().length === 0) {
			return res.status(400).json({ error: 'Name is required' });
		}

		const trimmedName = name.trim();

		// Check if user already exists
		const existingUser = await db.select().from(users).where(eq(users.name, trimmedName)).get();

		if (existingUser) {
			return res.json({
				success: true,
				userId: existingUser.id,
				name: existingUser.name,
				isNewUser: false
			});
		}

		// Create new user
		const newUserId = crypto.randomUUID();
		const newUser = {
			id: newUserId,
			name: trimmedName,
			createdAt: new Date()
		};

		await db.insert(users).values(newUser);

		res.json({
			success: true,
			userId: newUserId,
			name: trimmedName,
			isNewUser: true
		});
	} catch (error) {
		console.error('Login error:', error);
		res.status(500).json({ error: 'Login failed' });
	}
});

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

		// Get the user details
		const user = await db.select().from(users).where(eq(users.id, userId)).get();
		if (!user) {
			return res.status(404).json({ error: 'User not found' });
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
			userName: user.name
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

// Leaderboard endpoint
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

// Update user profile endpoint
router.put('/users/:userId', async (req, res) => {
	try {
		const { userId } = req.params;
		const { name } = req.body;

		// Validate input
		if (!name || typeof name !== 'string') {
			return res.status(400).json({ error: 'Name is required and must be a string' });
		}

		const trimmedName = name.trim();
		if (trimmedName.length < 2 || trimmedName.length > 30) {
			return res.status(400).json({ error: 'Name must be between 2 and 30 characters' });
		}

		// Check if user exists
		const existingUser = await db.select().from(users).where(eq(users.id, userId)).limit(1);
		if (existingUser.length === 0) {
			return res.status(404).json({ error: 'User not found' });
		}

		// Update user name
		await db.update(users).set({ name: trimmedName }).where(eq(users.id, userId));

		// Return updated user
		const updatedUser = await db.select().from(users).where(eq(users.id, userId)).limit(1);
		res.json({ user: updatedUser[0] });
	} catch (error) {
		console.error('Error updating user:', error);
		res.status(500).json({ error: 'Failed to update user profile' });
	}
});

// Health check endpoint
router.get('/health', (req, res) => {
	res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
