// ABOUTME: Backup and restore script for Turso databases using SQLite dump format.
// ABOUTME: Supports backing up to local files and restoring from backups with validation.

import 'dotenv/config';
import { createClient } from '@libsql/client';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const backupDir = join(projectRoot, 'backups');

// Ensure backup directory exists
if (!existsSync(backupDir)) {
	mkdirSync(backupDir, { recursive: true });
}

function getDbClient(url, token) {
	if (!url) {
		throw new Error('DATABASE_URL is required');
	}

	if (url.startsWith('libsql://')) {
		if (!token) {
			throw new Error('DATABASE_AUTH_TOKEN is required for Turso databases');
		}
		return createClient({ url, authToken: token });
	} else {
		// Local SQLite
		return createClient({ url: `file:${url}` });
	}
}

async function getAllTables(db) {
	const result = await db.execute(
		"SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_litestream_%' AND name NOT LIKE '__drizzle_%' ORDER BY name"
	);
	return result.rows.map((row) => row.name);
}

async function getTableSchema(db, tableName) {
	const result = await db.execute(
		`SELECT sql FROM sqlite_master WHERE type='table' AND name='${tableName}'`
	);
	return result.rows[0]?.sql || '';
}

async function getTableData(db, tableName) {
	const result = await db.execute(`SELECT * FROM ${tableName}`);
	return result.rows;
}

async function backup(url, token, outputFile) {
	console.log('🔄 Starting backup...');
	console.log(`📦 Database: ${url}`);

	const db = getDbClient(url, token);
	const tables = await getAllTables(db);

	console.log(`📋 Found ${tables.length} tables: ${tables.join(', ')}`);

	let sqlDump = `-- Turso Database Backup
-- Generated: ${new Date().toISOString()}
-- Database: ${url}
-- Tables: ${tables.length}

PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;

`;

	for (const table of tables) {
		console.log(`  📄 Backing up table: ${table}`);

		// Get schema
		const schema = await getTableSchema(db, table);
		sqlDump += `-- Table: ${table}\n`;
		sqlDump += `DROP TABLE IF EXISTS ${table};\n`;
		sqlDump += `${schema};\n\n`;

		// Get data
		const rows = await getTableData(db, table);
		if (rows.length > 0) {
			for (const row of rows) {
				const columns = Object.keys(row);
				const values = columns.map((col) => {
					const val = row[col];
					if (val === null) return 'NULL';
					if (typeof val === 'number') return val;
					if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
					return `'${String(val).replace(/'/g, "''")}'`;
				});
				sqlDump += `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
			}
			sqlDump += '\n';
		}
	}

	sqlDump += `COMMIT;
PRAGMA foreign_keys=ON;

-- Backup completed: ${new Date().toISOString()}
`;

	writeFileSync(outputFile, sqlDump, 'utf8');
	console.log(`✅ Backup completed: ${outputFile}`);
	console.log(`📊 File size: ${(sqlDump.length / 1024).toFixed(2)} KB`);

	return outputFile;
}

async function restore(url, token, inputFile) {
	console.log('🔄 Starting restore...');
	console.log(`📦 Database: ${url}`);
	console.log(`📂 Backup file: ${inputFile}`);

	if (!existsSync(inputFile)) {
		throw new Error(`Backup file not found: ${inputFile}`);
	}

	const db = getDbClient(url, token);
	const sqlDump = readFileSync(inputFile, 'utf8');

	// Split into statements
	const statements = sqlDump
		.split('\n')
		.filter((line) => line.trim() && !line.trim().startsWith('--'))
		.join('\n')
		.split(';')
		.map((stmt) => stmt.trim())
		.filter((stmt) => stmt.length > 0);

	console.log(`📋 Executing ${statements.length} SQL statements...`);

	let executed = 0;
	for (const statement of statements) {
		try {
			await db.execute(statement);
			executed++;
			if (executed % 100 === 0) {
				console.log(`  ⏳ Progress: ${executed}/${statements.length} statements`);
			}
		} catch (error) {
			console.error(`❌ Error executing statement: ${statement.substring(0, 100)}...`);
			throw error;
		}
	}

	console.log(`✅ Restore completed: ${executed} statements executed`);
}

async function list() {
	const { readdirSync } = await import('fs');
	const files = readdirSync(backupDir)
		.filter((f) => f.endsWith('.sql'))
		.sort()
		.reverse();

	if (files.length === 0) {
		console.log('📂 No backups found in:', backupDir);
		return;
	}

	console.log(`📂 Backups in ${backupDir}:\n`);
	for (const file of files) {
		const filePath = join(backupDir, file);
		const stats = await import('fs').then((fs) => fs.statSync(filePath));
		const size = (stats.size / 1024).toFixed(2);
		const date = stats.mtime.toLocaleString();
		console.log(`  📄 ${file}`);
		console.log(`     Size: ${size} KB | Modified: ${date}\n`);
	}
}

// CLI
const command = process.argv[2];
const arg = process.argv[3];

if (!command) {
	console.log(`
Turso Database Backup & Restore Tool

Usage:
  node scripts/db-backup.js backup [filename]     Backup database to file
  node scripts/db-backup.js restore <filename>    Restore database from file
  node scripts/db-backup.js list                  List available backups

Environment Variables:
  DATABASE_URL         Database URL (required)
  DATABASE_AUTH_TOKEN  Auth token for Turso (required for remote)

Examples:
  node scripts/db-backup.js backup
  node scripts/db-backup.js backup my-backup.sql
  node scripts/db-backup.js restore backups/backup-2024-01-15.sql
  node scripts/db-backup.js list
`);
	process.exit(1);
}

const url = process.env.DATABASE_URL;
const token = process.env.DATABASE_AUTH_TOKEN;

try {
	if (command === 'backup') {
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
		const filename = arg || `backup-${timestamp}.sql`;
		const outputFile = filename.includes('/') ? filename : join(backupDir, filename);
		await backup(url, token, outputFile);
	} else if (command === 'restore') {
		if (!arg) {
			console.error('❌ Error: Backup file path required');
			process.exit(1);
		}
		const inputFile = arg.includes('/') ? arg : join(backupDir, arg);
		await restore(url, token, inputFile);
	} else if (command === 'list') {
		await list();
	} else {
		console.error(`❌ Unknown command: ${command}`);
		process.exit(1);
	}
} catch (error) {
	console.error('❌ Error:', error.message);
	process.exit(1);
}
