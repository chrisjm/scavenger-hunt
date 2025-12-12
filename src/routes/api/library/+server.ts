// ABOUTME: Provides the authenticated user's photo library (list, upload, delete).
// ABOUTME: Uses S3 for storage and performs server-side image resizing for uploads.

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { desc, eq } from 'drizzle-orm';
import sharp from 'sharp';
import { db, schema } from '$lib/server/db';
import { buildObjectKey, uploadBufferToS3 } from '$lib/utils/s3';

const RESIZE_CONFIG = {
	maxWidth: 800,
	maxHeight: 800,
	quality: 80
};

async function resizeImageBuffer(buffer: Buffer) {
	const metadata = await sharp(buffer).metadata();
	const { width, height } = metadata;

	const originalWidth = width ?? RESIZE_CONFIG.maxWidth;
	const originalHeight = height ?? RESIZE_CONFIG.maxHeight;

	const needsResize =
		!width ||
		!height ||
		width > RESIZE_CONFIG.maxWidth ||
		height > RESIZE_CONFIG.maxHeight ||
		buffer.length > 2 * 1024 * 1024;

	if (!needsResize) {
		return buffer;
	}

	const widthRatio = RESIZE_CONFIG.maxWidth / originalWidth;
	const heightRatio = RESIZE_CONFIG.maxHeight / originalHeight;
	const scale = Math.min(widthRatio, heightRatio);
	const newWidth = Math.round(originalWidth * scale);
	const newHeight = Math.round(originalHeight * scale);

	return await sharp(buffer)
		.resize(newWidth, newHeight, {
			fit: 'inside',
			withoutEnlargement: true
		})
		.jpeg({
			quality: RESIZE_CONFIG.quality,
			progressive: true
		})
		.toBuffer();
}

// GET /api/library - current user's photo library
export const GET: RequestHandler = async ({ locals }) => {
	try {
		const authUser = locals.user;
		if (!authUser) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const userId = authUser.userId;
		const { photos } = schema;

		const userPhotos = await db
			.select()
			.from(photos)
			.where(eq(photos.userId, userId))
			.orderBy(desc(photos.createdAt));

		return json(userPhotos);
	} catch (error) {
		console.error('Library list error (SvelteKit):', error);
		return json({ error: 'Failed to fetch library' }, { status: 500 });
	}
};

// POST /api/library/upload
export const POST: RequestHandler = async ({ locals, request }) => {
	try {
		console.log('Library upload: start');
		const authUser = locals.user;
		if (!authUser) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const formData = await request.formData();
		const file = formData.get('image');

		if (!(file instanceof File)) {
			console.warn('Library upload: no file in formData', {
				formDataKeys: Array.from(formData.keys())
			});
			return json({ error: 'No image provided' }, { status: 400 });
		}

		const userId = authUser.userId;
		if (!userId) {
			return json({ error: 'User ID required' }, { status: 400 });
		}

		const arrayBuffer = await file.arrayBuffer();
		let buffer = Buffer.from(arrayBuffer) as Buffer<ArrayBufferLike> | Buffer<ArrayBuffer>;

		console.log('Library upload: received file', {
			userId,
			fileName: file.name,
			fileType: file.type,
			fileSize: buffer.length
		});

		// Basic file size limit (10MB) and type check similar to multer config
		if (buffer.length > 10 * 1024 * 1024) {
			return json(
				{ error: 'Image file is too large. Please choose a file smaller than 10MB.' },
				{ status: 413 }
			);
		}

		if (!file.type.startsWith('image/')) {
			return json(
				{ error: 'Please select a valid image file (JPG, PNG, GIF, etc.)' },
				{ status: 400 }
			);
		}

		// Resize image similarly to imageResize middleware
		try {
			buffer = await resizeImageBuffer(buffer);
			console.log('Library upload: resized image', { resizedSize: buffer.length });
		} catch (err) {
			console.error('Server-side image resize failed (SvelteKit):', err);
			// keep original buffer unchanged
		}

		const ext = file.type.split('/')[1] || 'jpg';
		const key = buildObjectKey(`library/${Date.now()}-${crypto.randomUUID()}.${ext}`);

		let filePath: string;
		try {
			filePath = await uploadBufferToS3({
				buffer,
				contentType: file.type || 'image/jpeg',
				key
			});
			console.log('Library upload: uploaded to S3', { key, filePath });
		} catch (err) {
			console.error('Library upload: S3 upload failed', err);
			throw err;
		}

		const { photos } = schema;
		const photoId = crypto.randomUUID();

		const [newPhoto] = await db
			.insert(photos)
			.values({
				id: photoId,
				userId,
				filePath,
				originalFilename: file.name,
				fileSize: buffer.length
			})
			.returning();

		console.log('Library upload: DB insert complete', { photoId, userId });

		return json({ success: true, photo: newPhoto });
	} catch (error) {
		console.error('Upload error (SvelteKit library):', error);
		return json({ error: 'Upload failed' }, { status: 500 });
	}
};
