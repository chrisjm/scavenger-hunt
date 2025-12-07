import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';

const RESIZE_CONFIG = {
	maxWidth: 800,
	maxHeight: 800,
	quality: 80,
	format: 'jpeg'
};

/**
 * Middleware to resize images on the server side as a fallback
 * This runs after multer has saved the original file
 */
export function resizeImageMiddleware(config = {}) {
	const finalConfig = { ...RESIZE_CONFIG, ...config };

	return async (req, res, next) => {
		// Skip if no file was uploaded
		if (!req.file) {
			return next();
		}

		const originalPath = req.file.path;
		const originalSize = req.file.size;

		try {
			// Get image metadata
			const metadata = await sharp(originalPath).metadata();
			const { width, height } = metadata;

			// Check if resize is needed
			const needsResize =
				width > finalConfig.maxWidth ||
				height > finalConfig.maxHeight ||
				originalSize > 2 * 1024 * 1024; // 2MB

			if (!needsResize) {
				console.log(
					`📸 Image ${req.file.filename}: No resize needed (${width}×${height}, ${formatBytes(originalSize)})`
				);
				return next();
			}

			// Calculate new dimensions
			const { width: newWidth, height: newHeight } = calculateDimensions(
				width,
				height,
				finalConfig.maxWidth,
				finalConfig.maxHeight
			);

			// Create resized image
			const resizedBuffer = await sharp(originalPath)
				.resize(newWidth, newHeight, {
					fit: 'inside',
					withoutEnlargement: true
				})
				.jpeg({
					quality: finalConfig.quality,
					progressive: true
				})
				.toBuffer();

			// Replace original file with resized version
			await fs.writeFile(originalPath, resizedBuffer);

			// Update file object with new size
			const newSize = resizedBuffer.length;
			req.file.size = newSize;

			const compressionRatio = Math.round((1 - newSize / originalSize) * 100);

			console.log(
				`📸 Image ${req.file.filename}: Resized ${width}×${height} → ${newWidth}×${newHeight}, ${formatBytes(originalSize)} → ${formatBytes(newSize)} (${compressionRatio}% smaller)`
			);

			// Add resize info to request for logging
			req.resizeInfo = {
				originalSize,
				resizedSize: newSize,
				compressionRatio,
				dimensions: {
					original: { width, height },
					resized: { width: newWidth, height: newHeight }
				}
			};
		} catch (error) {
			console.error('Server-side image resize failed:', error);
			// Continue with original file if resize fails
		}

		next();
	};
}

/**
 * Calculate new dimensions while maintaining aspect ratio
 */
function calculateDimensions(originalWidth, originalHeight, maxWidth, maxHeight) {
	// If image is already smaller than max dimensions, return original size
	if (originalWidth <= maxWidth && originalHeight <= maxHeight) {
		return { width: originalWidth, height: originalHeight };
	}

	// Calculate scaling factor
	const widthRatio = maxWidth / originalWidth;
	const heightRatio = maxHeight / originalHeight;
	const scale = Math.min(widthRatio, heightRatio);

	return {
		width: Math.round(originalWidth * scale),
		height: Math.round(originalHeight * scale)
	};
}

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes) {
	if (bytes === 0) return '0 B';
	const k = 1024;
	const sizes = ['B', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
