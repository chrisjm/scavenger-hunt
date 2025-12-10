// ABOUTME: Resizes uploaded images (buffer-based) to sane bounds before storage.
// ABOUTME: Updates req.file.buffer and size; no filesystem writes.
import sharp from 'sharp';

const RESIZE_CONFIG = {
	maxWidth: 800,
	maxHeight: 800,
	quality: 80,
	format: 'jpeg'
};

export function resizeImageMiddleware(config = {}) {
	const finalConfig = { ...RESIZE_CONFIG, ...config };

	return async (req, res, next) => {
		if (!req.file || !req.file.buffer) {
			return next();
		}

		const originalSize = req.file.size;

		try {
			const metadata = await sharp(req.file.buffer).metadata();
			const { width, height } = metadata;

			const needsResize =
				!width ||
				!height ||
				width > finalConfig.maxWidth ||
				height > finalConfig.maxHeight ||
				originalSize > 2 * 1024 * 1024;

			if (!needsResize) {
				return next();
			}

			const { width: newWidth, height: newHeight } = calculateDimensions(
				width,
				height,
				finalConfig.maxWidth,
				finalConfig.maxHeight
			);

			const resizedBuffer = await sharp(req.file.buffer)
				.resize(newWidth, newHeight, {
					fit: 'inside',
					withoutEnlargement: true
				})
				.jpeg({
					quality: finalConfig.quality,
					progressive: true
				})
				.toBuffer();

			req.file.buffer = resizedBuffer;
			req.file.size = resizedBuffer.length;
		} catch (error) {
			console.error('Server-side image resize failed:', error);
			// Proceed with original buffer
		}

		next();
	};
}

function calculateDimensions(originalWidth, originalHeight, maxWidth, maxHeight) {
	if (!originalWidth || !originalHeight) {
		return { width: maxWidth, height: maxHeight };
	}
	if (originalWidth <= maxWidth && originalHeight <= maxHeight) {
		return { width: originalWidth, height: originalHeight };
	}
	const widthRatio = maxWidth / originalWidth;
	const heightRatio = maxHeight / originalHeight;
	const scale = Math.min(widthRatio, heightRatio);
	return {
		width: Math.round(originalWidth * scale),
		height: Math.round(originalHeight * scale)
	};
}
