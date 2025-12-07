#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

const envExamplePath = path.join(projectRoot, '.env.example');
const envPath = path.join(projectRoot, '.env');

console.log('🔧 Setting up environment variables...\n');

// Check if .env already exists
if (fs.existsSync(envPath)) {
	console.log('✅ .env file already exists');
	console.log('💡 Make sure to update it with your actual API keys\n');
} else {
	// Copy .env.example to .env
	if (fs.existsSync(envExamplePath)) {
		fs.copyFileSync(envExamplePath, envPath);
		console.log('✅ Created .env file from .env.example');
		console.log('📝 Please edit .env with your actual values:\n');
	} else {
		console.log('❌ .env.example file not found');
		process.exit(1);
	}
}

// Show what needs to be configured
console.log('Required environment variables:');
console.log('  📊 DATABASE_URL - Path to SQLite database (default: local.db)');
console.log('  🤖 GEMINI_API_KEY - Get from https://makersuite.google.com/app/apikey');
console.log('\nOptional environment variables:');
console.log('  🌐 PORT - Server port (default: 3000)');
console.log('  🏗️  NODE_ENV - Environment mode (default: development)');

console.log('\n🚀 After setting up your .env file, run:');
console.log('   pnpm server:dev');
