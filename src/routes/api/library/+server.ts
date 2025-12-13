// ABOUTME: Provides the authenticated user's photo library (list, upload, delete).
// ABOUTME: Uses S3 for storage and performs server-side image resizing for uploads.

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { desc, eq } from 'drizzle-orm';
import sharp from 'sharp';
import { db, schema } from '$lib/server/db';
import { buildObjectKey, uploadBufferToS3 } from '$lib/utils/s3';

const S3_DEBUG = process.env.S3_DEBUG === 'true' || process.env.APP_DEBUG_S3 === 'true';

const RESIZE_CONFIG = {
	maxWidth: 800,
	maxHeight: 800,
	quality: 80
};

async function resizeImageBuffer(buffer: Buffer, contentType: string) {
	const metadata = await sharp(buffer).metadata();
	const { width, height, orientation } = metadata;

	const originalExt = contentType.split('/')[1] || 'jpg';

	const needsResize =
		!width ||
		!height ||
		width > RESIZE_CONFIG.maxWidth ||
		height > RESIZE_CONFIG.maxHeight ||
		buffer.length > 2 * 1024 * 1024;
	const needsRotate = typeof orientation === 'number' && orientation !== 1;

	if (!needsResize && !needsRotate) {
		return { buffer, contentType, ext: originalExt };
	}

	const pipeline = sharp(buffer).rotate();
	if (needsResize) {
		pipeline.resize(RESIZE_CONFIG.maxWidth, RESIZE_CONFIG.maxHeight, {
			fit: 'inside',
			withoutEnlargement: true
		});
	}

	return await pipeline
		.jpeg({
			quality: RESIZE_CONFIG.quality,
			progressive: true
		})
		.toBuffer()
		.then((out) => ({ buffer: out, contentType: 'image/jpeg', ext: 'jpg' }));
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

		let fileType = file.type || 'image/jpeg';
		let ext = fileType.split('/')[1] || 'jpg';

		// Resize image similarly to imageResize middleware
		try {
			const resized = await resizeImageBuffer(buffer, fileType);
			buffer = resized.buffer;
			console.log('Library upload: resized image', {
				resizedSize: buffer.length,
				outputContentType: resized.contentType,
				outputExt: resized.ext
			});
			// Update upload metadata to match what we actually encoded
			fileType = resized.contentType;
			ext = resized.ext;
		} catch (err) {
			console.error('Server-side image resize failed (SvelteKit):', err);
			// keep original buffer unchanged
		}

		const key = buildObjectKey(`library/${Date.now()}-${crypto.randomUUID()}.${ext}`);

		let filePath: string;
		try {
			filePath = await uploadBufferToS3({
				buffer,
				contentType: fileType,
				key
			});
			console.log('Library upload: uploaded to S3', { key, filePath });
		} catch (err) {
			if (S3_DEBUG) {
				const e = err as {
					name?: string;
					message?: string;
					$metadata?: { requestId?: string; extendedRequestId?: string; httpStatusCode?: number };
				};
				console.error('Library upload: S3 upload failed (details)', {
					name: e?.name,
					message: e?.message,
					httpStatusCode: e?.$metadata?.httpStatusCode,
					requestId: e?.$metadata?.requestId,
					extendedRequestId: e?.$metadata?.extendedRequestId,
					key
				});
			} else {
				console.error('Library upload: S3 upload failed');
			}
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
		if (S3_DEBUG) {
			const e = error as { name?: string; message?: string };
			return json(
				{ error: 'Upload failed', debug: { name: e?.name, message: e?.message } },
				{ status: 500 }
			);
		}
		return json({ error: 'Upload failed' }, { status: 500 });
	}
};
