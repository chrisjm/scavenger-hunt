# Scavenger Hunt

[![CI](https://github.com/chrisjm/scavenger-hunt/actions/workflows/ci.yml/badge.svg)](https://github.com/chrisjm/scavenger-hunt/actions/workflows/ci.yml)

Serverless SvelteKit application for running group-based scavenger hunts. The app is deployed on Netlify and uses Turso (libsql) as the primary database, with Drizzle ORM for schema and migrations.

## Tech stack

- **Framework**: SvelteKit 2 / Svelte 5
- **Adapter**: `@sveltejs/adapter-netlify` (serverless on Netlify)
- **Database**: Turso / libsql via `@libsql/client` and `drizzle-orm`
- **Migrations & tooling**: `drizzle-kit`
- **AI**: Google Gemini via `@google/generative-ai`
- **Object storage**: AWS S3 (or compatible) via `@aws-sdk/client-s3`

## Getting started (local development)

### Prerequisites

- Node.js 20 (LTS)
- `pnpm` (preferred), or `npm`/`yarn`

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

Copy the example env file and adjust values as needed:

```bash
cp .env.example .env
```

Key variables (see `.env.example` for the full list):

- `DATABASE_URL` –
  - Local development default: `local.db` (libsql file in the project directory)
  - Production (Turso): `libsql://your-db.turso.io`
- `DATABASE_AUTH_TOKEN` – Turso auth token (required for remote Turso)
- `GEMINI_API_KEY` – Google Gemini API key
- `JWT_SECRET` – long random string for signing tokens
- `APP_AWS_ACCESS_KEY_ID`, `APP_AWS_SECRET_ACCESS_KEY`, `APP_AWS_REGION` – AWS credentials for S3
- `S3_BUCKET`, `S3_PREFIX` – bucket name and key prefix for uploads

You can run the setup script to help with initial configuration:

```bash
pnpm setup
```

### 3. Database setup

With `DATABASE_URL` pointing at either a local libsql file or your Turso instance:

```bash
pnpm db:push   # apply schema to the database
pnpm db:seed   # seed initial scavenger-hunt data
```

### 4. Run the dev server

```bash
pnpm dev
```

Then open the printed URL in your browser (typically http://localhost:5173).

## Development scripts

- `pnpm dev` – start the development server
- `pnpm build` – build for production (Netlify adapter)
- `pnpm preview` – preview the production build locally
- `pnpm check` – typecheck and Svelte checks
- `pnpm lint` – lint + Prettier
- `pnpm test` / `pnpm test:unit` – run unit tests with Vitest
- `pnpm db:push` – sync Drizzle schema to the configured database
- `pnpm db:generate` – generate Drizzle migrations
- `pnpm db:migrate` – run migrations
- `pnpm db:seed` – seed initial data
- `pnpm setup` – project setup helper (env and related tasks)

## Deployment overview

Production deployments are handled by **Netlify** using the SvelteKit Netlify adapter. The SvelteKit server routes run as Netlify Functions, and the database is **Turso** (libsql) accessed over HTTPS.

High-level production flow:

1. Push to the main branch (or trigger a deploy in Netlify).
2. Netlify runs the build (`pnpm build`).
3. The built SvelteKit app is served from Netlify; server routes talk to Turso via `DATABASE_URL` and `DATABASE_AUTH_TOKEN`.

For detailed deployment steps and environment configuration, see `DEPLOYMENT.md`.
