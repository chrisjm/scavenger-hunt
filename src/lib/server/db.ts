import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from '$lib/server/db/schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set in environment variables.');
}

const client = new Database(process.env.DATABASE_URL);
export const db = drizzle(client, { schema });
export { schema };
