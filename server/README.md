# Server Structure

This directory contains the organized server code for the Scavenger Hunt application.

## Directory Structure

```
server/
├── index.js              # Main server entry point
├── routes/
│   └── api.js            # API endpoints (/api/*)
├── middleware/
│   └── upload.js         # File upload configuration
└── utils/
    ├── ai-validator.js   # Gemini AI validation logic
    ├── database.js       # Database connection and schema
    └── socket-handler.js # Socket.IO setup and handlers
```

## Key Features

- **Modular Architecture**: Separated concerns into logical modules
- **Clean API Routes**: All endpoints organized in `/routes/api.js`
- **Reusable Utilities**: AI validation and database logic in `/utils/`
- **Middleware**: File upload handling in `/middleware/`
- **Socket.IO Integration**: Real-time communication setup
- **Development Mode**: Graceful fallback when SvelteKit build is missing

## Usage

```bash
# Development (with file watching)
pnpm server:dev

# Production (requires build first)
pnpm start

# API-only mode (no SvelteKit build needed)
pnpm server
```

## Environment Variables

The server uses **dotenv** to automatically load environment variables from a `.env` file in the project root.

**Setup:**

```bash
# Copy the example file
cp .env.example .env

# Edit .env with your actual values
```

**Required:**

- `DATABASE_URL` - Path to SQLite database (e.g., `local.db`)
- `GEMINI_API_KEY` - Google Gemini API key

**Optional:**

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment mode (development/production)

**Validation:**
The server validates all required environment variables on startup and provides helpful error messages if any are missing.
