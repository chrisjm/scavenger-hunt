import path from 'node:path';
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { env } from '$env/dynamic/private';
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

const databaseUrl = env.DATABASE_URL;
const databaseAuthToken = env.DATABASE_AUTH_TOKEN;

if (!databaseUrl) {
	throw new Error('DATABASE_URL is not set in environment variables.');
}

const client = createClient({
	url: normalizeDatabaseUrl(databaseUrl),
	...(databaseAuthToken ? { authToken: databaseAuthToken } : {})
});
export const db = drizzle(client, { schema });
export { schema };
