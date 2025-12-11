import path from 'node:path';
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { DATABASE_URL } from '$env/static/private';
import * as schema from '$lib/server/db/schema';

function normalizeDatabaseUrl(url: string): string {
	const trimmed = url.trim();
	if (
		trimmed.startsWith('libsql://') ||
		trimmed.startsWith('http://') ||
		trimmed.startsWith('https://') ||
		trimmed.startsWith('file:')
	) {
		return trimmed;
	}

	// Treat bare paths as local file targets
	const absolutePath = trimmed.startsWith('/') ? trimmed : path.join(process.cwd(), trimmed);
	return `file:${absolutePath}`;
}

if (!DATABASE_URL) {
	throw new Error('DATABASE_URL is not set in environment variables.');
}

const client = createClient({
	url: normalizeDatabaseUrl(DATABASE_URL),
	authToken: process.env.DATABASE_AUTH_TOKEN
});
export const db = drizzle(client, { schema });
export { schema };
