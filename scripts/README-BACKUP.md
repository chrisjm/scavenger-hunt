# Database Backup & Restore

This script provides backup and restore functionality for Turso databases.

## Features

- ✅ Backup entire database to SQL dump file
- ✅ Restore database from backup file
- ✅ List all available backups
- ✅ Works with both Turso (remote) and local SQLite databases
- ✅ Automatic timestamp-based filenames
- ✅ Progress tracking for large restores
- ✅ Foreign key handling

## Usage

### Backup Database

Create a backup with automatic timestamp:

```bash
pnpm db:backup
```

Create a backup with custom filename:

```bash
pnpm db:backup my-backup.sql
```

Or use the script directly:

```bash
node scripts/db-backup.js backup
node scripts/db-backup.js backup custom-name.sql
```

### Restore Database

Restore from a backup file:

```bash
pnpm db:restore backups/backup-2024-12-23.sql
```

Or use the script directly:

```bash
node scripts/db-backup.js restore backups/backup-2024-12-23.sql
```

### List Backups

View all available backups:

```bash
pnpm db:backup:list
```

Or use the script directly:

```bash
node scripts/db-backup.js list
```

## Environment Variables

The script uses the following environment variables from your `.env` file:

- `DATABASE_URL` - Database connection URL (required)
- `DATABASE_AUTH_TOKEN` - Auth token for Turso databases (required for remote)

## Backup Location

Backups are stored in the `backups/` directory at the project root. This directory is automatically created if it doesn't exist and is excluded from git via `.gitignore`.

## Backup Format

Backups are created as SQL dump files containing:

- Table schemas (CREATE TABLE statements)
- All data (INSERT statements)
- Metadata comments (timestamp, database info)
- Transaction wrapping for atomic restore

## Examples

### Daily Backup Workflow

```bash
# Create a backup before making changes
pnpm db:backup

# Make your changes...

# If something goes wrong, restore from backup
pnpm db:backup:list  # Find the backup file
pnpm db:restore backups/backup-2024-12-23.sql
```

### Pre-Migration Backup

```bash
# Backup before running migrations
pnpm db:backup pre-migration-$(date +%Y%m%d).sql
pnpm db:migrate

# If migration fails, restore
pnpm db:restore backups/pre-migration-20241223.sql
```

### Environment-Specific Backups

```bash
# Backup dev database
DATABASE_URL=libsql://dev.turso.io DATABASE_AUTH_TOKEN=xxx pnpm db:backup dev-backup.sql

# Backup prod database
DATABASE_URL=libsql://prod.turso.io DATABASE_AUTH_TOKEN=xxx pnpm db:backup prod-backup.sql
```

## Notes

- **Foreign Keys**: The script disables foreign key constraints during restore to avoid dependency issues
- **Transactions**: Restores are wrapped in a transaction for atomicity
- **Progress**: Large restores show progress every 100 statements
- **Validation**: The script validates that backup files exist before attempting restore
- **Exclusions**: System tables (sqlite*\*, \_litestream*_, \_*drizzle*_) are excluded from backups

## Troubleshooting

### "DATABASE_URL is required"

Make sure your `.env` file has `DATABASE_URL` set.

### "DATABASE_AUTH_TOKEN is required"

For Turso databases, you need `DATABASE_AUTH_TOKEN` in your `.env` file.

### "Backup file not found"

Check that the file path is correct. Use `pnpm db:backup:list` to see available backups.

### Restore fails with constraint errors

The script should handle foreign keys automatically. If you still see errors, check that the backup file is complete and not corrupted.

## Security

⚠️ **Important**: Backup files contain all your database data including sensitive information.

- Never commit backups to git (they're in `.gitignore`)
- Store backups securely
- Encrypt backups if storing externally
- Rotate old backups regularly
