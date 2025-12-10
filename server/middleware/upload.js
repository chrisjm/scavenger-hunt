// ABOUTME: Handles multipart image uploads using memory storage for downstream processing.
// ABOUTME: Enforces basic image validation and size limits before resizing/S3 upload.
import multer from 'multer';

const storage = multer.memoryStorage();

export const upload = multer({
	storage,
	limits: {
		fileSize: 10 * 1024 * 1024 // 10MB limit
	},
	fileFilter: (req, file, cb) => {
		if (file.mimetype.startsWith('image/')) {
			cb(null, true);
		} else {
			cb(new Error('Only image files are allowed!'), false);
		}
	}
});
