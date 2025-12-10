import express from 'express';
import crypto from 'node:crypto';
import { eq, and, desc } from 'drizzle-orm';
import { db, schema } from '../utils/database.js';
import { upload } from '../middleware/upload.js';
import { resizeImageMiddleware } from '../middleware/imageResize.js';
import { requireAuth } from '../middleware/auth.js';
import { buildObjectKey, deleteFromS3, extractKeyFromUrl, uploadBufferToS3 } from '../utils/s3.js';

const router = express.Router();
router.use(requireAuth);
const { photos } = schema;

// GET /api/library - library for current authenticated user
router.get('/', async (req, res) => {
	try {
		const userId = req.user?.userId;
		if (!userId) return res.status(401).json({ error: 'Unauthorized' });

		const userPhotos = await db
			.select()
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
router.post('/upload', upload.single('image'), resizeImageMiddleware(), async (req, res) => {
	try {
		if (!req.file || !req.file.buffer) return res.status(400).json({ error: 'No image provided' });

		const userId = req.user?.userId;
		if (!userId) {
			return res.status(400).json({ error: 'User ID required' });
		}

		const ext = req.file.mimetype?.split('/')?.[1] || 'jpg';
		const key = buildObjectKey(`library/${Date.now()}-${crypto.randomUUID()}.${ext}`);
		const filePath = await uploadBufferToS3({
			buffer: req.file.buffer,
			contentType: req.file.mimetype || 'image/jpeg',
			key
		});

		const photoId = crypto.randomUUID();

		const [newPhoto] = await db
			.insert(photos)
			.values({
				id: photoId,
				userId,
				filePath,
				originalFilename: req.file.originalname,
				fileSize: req.file.size
			})
			.returning();

		res.json({ success: true, photo: newPhoto });
	} catch (error) {
		console.error('Upload error:', error);
		res.status(500).json({ error: 'Upload failed' });
	}
});

// DELETE /api/library/:id
router.delete('/:id', async (req, res) => {
	try {
		const { id } = req.params;
		const userId = req.user?.userId;

		if (!userId) return res.status(401).json({ error: 'Unauthorized' });

		// 1. Verify ownership
		const photo = await db
			.select()
			.from(photos)
			.where(and(eq(photos.id, id), eq(photos.userId, userId)))
			.get();

		if (!photo) return res.status(404).json({ error: 'Photo not found or unauthorized' });

		// 2. Delete file from S3
		const key = extractKeyFromUrl(photo.filePath);
		await deleteFromS3(key).catch((err) => console.error('File delete warning:', err));

		// 3. Delete from DB (Cascade will handle submissions if configured, or we delete manually)
		await db.delete(photos).where(eq(photos.id, id));

		res.json({ success: true });
	} catch (error) {
		console.error('Delete error:', error);
		res.status(500).json({ error: 'Delete failed' });
	}
});

export default router;
