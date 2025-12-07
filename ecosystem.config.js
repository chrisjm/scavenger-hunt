module.exports = {
	apps: [
		{
			name: 'scavenger-hunt',
			script: 'server/index.js',
			instances: 1, // Single instance for SQLite
			autorestart: true,
			watch: false,
			max_memory_restart: '1G',
			env: {
				NODE_ENV: 'production',
				PORT: 3000,
				HOST: 'localhost'
			},
			env_production: {
				NODE_ENV: 'production',
				PORT: 3000,
				HOST: 'localhost'
			},
			// Logging
			log_file: './logs/combined.log',
			out_file: './logs/out.log',
			error_file: './logs/error.log',
			log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

			// Auto-restart on file changes in production (optional)
			ignore_watch: ['node_modules', 'logs', 'uploads', '.git'],

			// Graceful shutdown
			kill_timeout: 5000,

			// Health monitoring
			min_uptime: '10s',
			max_restarts: 10
		}
	]
};
