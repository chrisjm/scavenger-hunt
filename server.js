import { handler } from './build/handler.js';
import express from 'express';
import { Server } from 'socket.io';
import { createServer } from 'http';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
	cors: {
		origin: process.env.NODE_ENV === 'production' ? false : ['http://localhost:5173'],
		methods: ['GET', 'POST']
	}
});

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
	fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, uploadsDir);
	},
	filename: (req, file, cb) => {
		const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
		cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
	}
});

const upload = multer({
	storage: storage,
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

// Serve uploaded files statically
app.use('/uploads', express.static(uploadsDir));

// Parse JSON bodies
app.use(express.json());

// Socket.IO connection handling
io.on('connection', (socket) => {
	console.log('User connected:', socket.id);

	socket.on('join-room', (userId) => {
		socket.join('scavenger-hunt');
		console.log(`User ${userId} joined the scavenger hunt room`);
	});

	socket.on('disconnect', () => {
		console.log('User disconnected:', socket.id);
	});
});

// API Routes
app.post('/api/upload', upload.single('image'), async (req, res) => {
	try {
		if (!req.file) {
			return res.status(400).json({ error: 'No image file provided' });
		}

		const { userId, taskId } = req.body;
		if (!userId || !taskId) {
			return res.status(400).json({ error: 'userId and taskId are required' });
		}

		// TODO: Implement AI validation here
		// For now, just store the submission
		const submission = {
			id: crypto.randomUUID(),
			userId,
			taskId: parseInt(taskId),
			imagePath: `/uploads/${req.file.filename}`,
			submittedAt: new Date()
		};

		// Broadcast to all connected clients
		io.to('scavenger-hunt').emit('new-submission', submission);

		res.json({ success: true, submission });
	} catch (error) {
		console.error('Upload error:', error);
		res.status(500).json({ error: 'Upload failed' });
	}
});

// Health check endpoint
app.get('/api/health', (req, res) => {
	res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Let SvelteKit handle everything else
app.use(handler);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
	console.log(`🚀 Server running on http://localhost:${PORT}`);
	console.log(`📁 Uploads directory: ${uploadsDir}`);
});
