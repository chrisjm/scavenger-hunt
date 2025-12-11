import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import apiRoutes from './routes/api.js';
import libraryRoutes from './routes/library.js';
import submissionRoutes from './routes/submissions.js';
import groupRoutes from './routes/groups.js';
import authRoutes from './routes/auth.js';

// Validate required environment variables
const requiredEnvVars = ['DATABASE_URL', 'GEMINI_API_KEY'];
const missingEnvVars = requiredEnvVars.filter((varName) => !process.env[varName]);

if (missingEnvVars.length > 0) {
	console.error('❌ Missing required environment variables:');
	missingEnvVars.forEach((varName) => {
		console.error(`   - ${varName}`);
	});
	console.error('\n💡 Make sure you have a .env file with the required variables.');
	console.error('   Copy .env.example to .env and fill in the values.\n');
	process.exit(1);
}

const app = express();

// Middleware
app.use(cookieParser());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);
app.use('/api/library', libraryRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/groups', groupRoutes);

// SvelteKit handler (only after build)
let handler;
try {
	const svelteHandler = await import('../build/handler.js');
	handler = svelteHandler.handler;
	console.log('✅ SvelteKit handler loaded');
} catch (error) {
	console.log('⚠️  SvelteKit handler not found. Run "pnpm build" first.');
	console.log('   Server will run in API-only mode for development.');

	// Fallback for development - serve a simple message
	handler = (req, res, next) => {
		if (req.path.startsWith('/api')) {
			return next();
		}
		res.status(200).send(`
			<html>
				<body style="font-family: system-ui; padding: 2rem; text-align: center;">
					<h1>🎄 Scavenger Hunt Server</h1>
					<p>API server is running!</p>
					<p>Run <code>pnpm build</code> to enable the full application.</p>
					<p>API endpoints available:</p>
					<ul style="list-style: none;">
						<li><a href="/api/health">/api/health</a></li>
						<li><a href="/api/tasks">/api/tasks</a></li>
					</ul>
				</body>
			</html>
		`);
	};
}

// Let SvelteKit handle everything else
app.use(handler);

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

app.listen(PORT, HOST, () => {
	console.log(`🚀 Server running on http://${HOST}:${PORT}`);

	// If binding to all interfaces, show network info
	if (HOST === '0.0.0.0') {
		console.log(
			`📱 Network access: Find your computer's IP address and use http://[YOUR_IP]:${PORT}`
		);
		console.log(`💡 On Mac: System Settings > Network, or run 'ifconfig | grep inet'`);
		console.log(`💡 On Windows: ipconfig | findstr IPv4`);
	}

	console.log(`🤖 AI validation ready`);
	console.log(`🗄️  Database: ${process.env.DATABASE_URL}`);
	console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
	console.log(`✅ All environment variables loaded`);
});
