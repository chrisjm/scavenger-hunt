import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { DATABASE_URL } from '$env/static/private';
import * as schema from '$lib/server/db/schema';

if (!DATABASE_URL) {
	throw new Error('DATABASE_URL is not set in environment variables.');
}

const client = createClient({
	url: DATABASE_URL,
	authToken: process.env.DATABASE_AUTH_TOKEN
});
export const db = drizzle(client, { schema });
export { schema };
