export interface ResizeConfig {
	maxWidth: number;
	maxHeight: number;
	quality: number;
	format: 'jpeg' | 'png' | 'webp';
}

export interface ResizeResult {
	file: File;
	originalSize: number;
	resizedSize: number;
	compressionRatio: number;
	dimensions: {
		original: { width: number; height: number };
		resized: { width: number; height: number };
	};
}

const DEFAULT_CONFIG: ResizeConfig = {
	maxWidth: 800,
	maxHeight: 800,
	quality: 0.8,
	format: 'jpeg'
};

/**
 * Resizes an image file using HTML5 Canvas
 * @param file - The original image file
 * @param config - Resize configuration options
 * @returns Promise<ResizeResult> - The resized file and metadata
 */
export async function resizeImage(
	file: File,
	config: Partial<ResizeConfig> = {}
): Promise<ResizeResult> {
	const finalConfig = { ...DEFAULT_CONFIG, ...config };

	return new Promise((resolve, reject) => {
		// Create image element
		const img = new Image();
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d');

		if (!ctx) {
			reject(new Error('Canvas context not available'));
			return;
		}

		img.onload = () => {
			try {
				const { width: originalWidth, height: originalHeight } = img;

				// Calculate new dimensions while maintaining aspect ratio
				const { width: newWidth, height: newHeight } = calculateDimensions(
					originalWidth,
					originalHeight,
					finalConfig.maxWidth,
					finalConfig.maxHeight
				);

				// Set canvas dimensions
				canvas.width = newWidth;
				canvas.height = newHeight;

				// Configure canvas for high quality rendering
				ctx.imageSmoothingEnabled = true;
				ctx.imageSmoothingQuality = 'high';

				// Draw resized image
				ctx.drawImage(img, 0, 0, newWidth, newHeight);

				// Convert to blob
				canvas.toBlob(
					(blob) => {
						if (!blob) {
							reject(new Error('Failed to create blob from canvas'));
							return;
						}

						// Create new file with resized content
						const resizedFile = new File([blob], file.name, {
							type: `image/${finalConfig.format}`,
							lastModified: Date.now()
						});

						const result: ResizeResult = {
							file: resizedFile,
							originalSize: file.size,
							resizedSize: resizedFile.size,
							compressionRatio: Math.round((1 - resizedFile.size / file.size) * 100),
							dimensions: {
								original: { width: originalWidth, height: originalHeight },
								resized: { width: newWidth, height: newHeight }
							}
						};

						resolve(result);
					},
					`image/${finalConfig.format}`,
					finalConfig.quality
				);
			} catch (error) {
				reject(error);
			}
		};

		img.onerror = () => {
			reject(new Error('Failed to load image'));
		};

		// Load the image
		img.src = URL.createObjectURL(file);
	});
}

/**
 * Calculate new dimensions while maintaining aspect ratio
 */
function calculateDimensions(
	originalWidth: number,
	originalHeight: number,
	maxWidth: number,
	maxHeight: number
): { width: number; height: number } {
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
 * Format file size in human readable format
 */
export function formatFileSize(bytes: number): string {
	if (bytes === 0) return '0 B';

	const k = 1024;
	const sizes = ['B', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Check if file needs resizing based on dimensions or file size
 */
export async function shouldResize(
	file: File,
	config: Partial<ResizeConfig> = {}
): Promise<boolean> {
	const finalConfig = { ...DEFAULT_CONFIG, ...config };

	// Always resize if file is over 2MB
	if (file.size > 2 * 1024 * 1024) {
		return true;
	}

	// Check dimensions
	return new Promise((resolve) => {
		const img = new Image();
		img.onload = () => {
			const needsResize = img.width > finalConfig.maxWidth || img.height > finalConfig.maxHeight;
			resolve(needsResize);
		};
		img.onerror = () => resolve(true); // Resize on error to be safe
		img.src = URL.createObjectURL(file);
	});
}
