import express from 'express';
import path from 'path';
import { eq, count, desc } from 'drizzle-orm';
import { db, schema } from '../utils/database.js';
import { validateImageWithAI, isSubmissionValid } from '../utils/ai-validator.js';
import { upload, uploadsDir } from '../middleware/upload.js';
import { resizeImageMiddleware } from '../middleware/imageResize.js';

const router = express.Router();
const { tasks, submissions, users } = schema;

// Login endpoint - logs in existing user or creates new user
router.post('/login', async (req, res) => {
	try {
		const { name, isReturningUser = false } = req.body;

		if (!name || typeof name !== 'string' || name.trim().length === 0) {
			return res.status(400).json({ error: 'Name is required' });
		}

		const trimmedName = name.trim();

		if (trimmedName.length < 2 || trimmedName.length > 30) {
			return res.status(400).json({ error: 'Name must be between 2 and 30 characters' });
		}

		// Check if user already exists
		const existingUser = await db.select().from(users).where(eq(users.name, trimmedName)).limit(1);

		if (existingUser.length > 0) {
			// User exists - log them in
			return res.json({
				userId: existingUser[0].id,
				userName: existingUser[0].name,
				isReturningUser: true
			});
		}

		// User doesn't exist
		if (isReturningUser) {
			// They tried to log in as returning user but name doesn't exist
			return res.status(404).json({
				error: 'User not found',
				message: `No user found with the name "${trimmedName}". Please check your spelling or create a new account.`
			});
		}

		// Create new user
		const newUser = await db.insert(users).values({ name: trimmedName }).returning();
		res.json({
			userId: newUser[0].id,
			userName: newUser[0].name,
			isReturningUser: false
		});
	} catch (error) {
		console.error('Login error:', error);
		// Handle unique constraint violation at database level
		if (error.message && error.message.includes('UNIQUE constraint failed')) {
			return res.status(409).json({
				error: 'Name already taken',
				message: 'This name is already taken. Please choose a different name.'
			});
		}
		res.status(500).json({ error: 'Login failed' });
	}
});

// Check name availability endpoint
router.get('/check-name/:name', async (req, res) => {
	try {
		const { name } = req.params;

		if (!name || name.trim().length === 0) {
			return res.status(400).json({ error: 'Name is required' });
		}

		const trimmedName = name.trim();

		if (trimmedName.length < 2 || trimmedName.length > 30) {
			return res.status(400).json({
				available: false,
				error: 'Name must be between 2 and 30 characters'
			});
		}

		// Check if name exists
		const existingUser = await db.select().from(users).where(eq(users.name, trimmedName)).limit(1);

		res.json({
			available: existingUser.length === 0,
			name: trimmedName
		});
	} catch (error) {
		console.error('Name check error:', error);
		res.status(500).json({ error: 'Failed to check name availability' });
	}
});

// Upload endpoint with image resizing
router.post(
	'/upload',
	(req, res, next) => {
		upload.single('image')(req, res, (err) => {
			if (err) {
				console.error('Multer error:', err);

				if (err.code === 'LIMIT_FILE_SIZE') {
					return res.status(413).json({
						error: 'Image file is too large. Please choose a file smaller than 10MB.'
					});
				}

				if (err.message === 'Only image files are allowed!') {
					return res.status(400).json({
						error: 'Please select a valid image file (JPG, PNG, GIF, etc.)'
					});
				}

				return res.status(400).json({
					error: 'File upload error. Please try again with a different image.'
				});
			}

			next();
		});
	},
	resizeImageMiddleware(),
	async (req, res) => {
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

			// Provide more specific error messages
			if (error.message && error.message.includes('FOREIGN KEY constraint failed')) {
				return res.status(400).json({
					error: 'Invalid user or task. Please refresh the page and try again.'
				});
			}

			if (error.message && error.message.includes('SQLITE_BUSY')) {
				return res.status(503).json({
					error: 'Database is busy. Please try again in a moment.'
				});
			}

			if (error.message && error.message.includes('AI validation failed')) {
				return res.status(500).json({
					error: 'AI image analysis is temporarily unavailable. Please try again later.'
				});
			}

			// Generic server error
			res.status(500).json({
				error: 'Server error occurred while processing your image. Please try again.'
			});
		}
	}
);

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

		// Check if the new name is already taken by another user
		const nameConflict = await db.select().from(users).where(eq(users.name, trimmedName)).limit(1);

		if (nameConflict.length > 0 && nameConflict[0].id !== userId) {
			return res.status(409).json({
				error: 'Name already taken',
				message: `"${trimmedName}" is already taken. Please choose a different name.`
			});
		}

		// Update user name
		await db.update(users).set({ name: trimmedName }).where(eq(users.id, userId));

		// Return updated user
		const updatedUser = await db.select().from(users).where(eq(users.id, userId)).limit(1);
		res.json({ user: updatedUser[0] });
	} catch (error) {
		console.error('Error updating user:', error);
		// Handle unique constraint violation at database level
		if (error.message && error.message.includes('UNIQUE constraint failed')) {
			return res.status(409).json({
				error: 'Name already taken',
				message: 'This name is already taken. Please choose a different name.'
			});
		}
		res.status(500).json({ error: 'Failed to update user profile' });
	}
});

// Health check endpoint
router.get('/health', (req, res) => {
	res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
