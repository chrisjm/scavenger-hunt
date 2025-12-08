import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import { eq, and, desc } from 'drizzle-orm';
import { db, schema } from '../utils/database.js';
import { upload, uploadsDir } from '../middleware/upload.js';
import { resizeImageMiddleware } from '../middleware/imageResize.js';

const router = express.Router();
const { photos } = schema;

// GET /api/library?userId=[UUID]
router.get('/', async (req, res) => {
	try {
		const { userId } = req.query;
		if (!userId) return res.status(400).json({ error: 'User ID required' });

		const userPhotos = await db.select()
			.from(photos)
			.where(eq(photos.userId, userId))
			.orderBy(desc(photos.createdAt));

		res.json(userPhotos);
	} catch (error) {
		console.error('Library list error:', error);
		res.status(500).json({ error: 'Failed to fetch library' });
	}
});

// POST /api/library/upload
router.post(
	'/upload',
	upload.single('image'),
	resizeImageMiddleware(),
	async (req, res) => {
		try {
			if (!req.file) return res.status(400).json({ error: 'No image provided' });

			const { userId } = req.body;
			if (!userId) {
				// Clean up orphan file if request is bad
				await fs.unlink(req.file.path).catch(() => {});
				return res.status(400).json({ error: 'User ID required' });
			}

			const photoId = crypto.randomUUID();
			const filePath = `/uploads/${req.file.filename}`;

			const [newPhoto] = await db.insert(photos).values({
				id: photoId,
				userId,
				filePath,
				originalFilename: req.file.originalname,
				fileSize: req.file.size
			}).returning();

			res.json({ success: true, photo: newPhoto });
		} catch (error) {
			console.error('Upload error:', error);
			res.status(500).json({ error: 'Upload failed' });
		}
	}
);

// DELETE /api/library/:id
router.delete('/:id', async (req, res) => {
	try {
		const { id } = req.params;
    // TODO: Get userId from auth token/session
		const { userId } = req.body;

		if (!userId) return res.status(401).json({ error: 'Unauthorized' });

		// 1. Verify ownership
		const photo = await db.select()
			.from(photos)
			.where(and(eq(photos.id, id), eq(photos.userId, userId)))
			.get();

		if (!photo) return res.status(404).json({ error: 'Photo not found or unauthorized' });

		// 2. Delete file from disk
		const absolutePath = path.join(process.cwd(), photo.filePath);
		await fs.unlink(absolutePath).catch(err => console.error('File delete warning:', err));

		// 3. Delete from DB (Cascade will handle submissions if configured, or we delete manually)
		await db.delete(photos).where(eq(photos.id, id));

		res.json({ success: true });
	} catch (error) {
		console.error('Delete error:', error);
		res.status(500).json({ error: 'Delete failed' });
	}
});

export default router;
