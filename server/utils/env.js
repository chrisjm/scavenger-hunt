/**
 * Environment configuration utility
 * Provides typed access to environment variables with validation
 */

export const env = {
	// Database
	DATABASE_URL: process.env.DATABASE_URL,

	// AI Service
	GEMINI_API_KEY: process.env.GEMINI_API_KEY,

	// Server
	PORT: parseInt(process.env.PORT || '3000'),
	NODE_ENV: process.env.NODE_ENV || 'development',

	// Computed values
	get isDevelopment() {
		return this.NODE_ENV === 'development';
	},

	get isProduction() {
		return this.NODE_ENV === 'production';
	}
};

/**
 * Validates that all required environment variables are set
 * @param {string[]} requiredVars - Array of required environment variable names
 * @throws {Error} If any required variables are missing
 */
export function validateEnv(requiredVars) {
	const missing = requiredVars.filter((varName) => !process.env[varName]);

	if (missing.length > 0) {
		throw new Error(
			`Missing required environment variables: ${missing.join(', ')}\n` +
				'Make sure you have a .env file with all required variables.'
		);
	}
}

/**
 * Gets an environment variable with a default value
 * @param {string} name - Environment variable name
 * @param {string} defaultValue - Default value if not set
 * @returns {string}
 */
export function getEnv(name, defaultValue = '') {
	return process.env[name] || defaultValue;
}
