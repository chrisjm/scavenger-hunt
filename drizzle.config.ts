import { defineConfig } from 'drizzle-kit';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

const url = process.env.DATABASE_URL;
const authToken = process.env.DATABASE_AUTH_TOKEN;
const dialect = (process.env.DATABASE_DIALECT || 'sqlite') as
	| 'sqlite'
	| 'turso'
	| 'postgresql'
	| 'mysql';
const isRemote =
	url.startsWith('libsql://') || url.startsWith('http://') || url.startsWith('https://');

if (isRemote && !authToken) {
	throw new Error('DATABASE_AUTH_TOKEN is required when using a remote DATABASE_URL');
}

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	dialect,
	dbCredentials: authToken ? { url, authToken } : { url },
	verbose: true,
	strict: true
});
