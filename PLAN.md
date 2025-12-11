# Backend Migration Plan: Express → SvelteKit Serverless

## 0. Goals & Constraints

- **Goal:** Retire the standalone Express server in `server/` and run everything on SvelteKit endpoints/handlers so we can deploy on a serverless platform.
- **Keep:**
  - SQLite + Drizzle as the primary data access layer.
  - AWS S3 for file storage.
- **Maybe change later:**
  - Underlying data storage backend (e.g., move from file-based SQLite to a hosted DB) **behind** Drizzle so the app code remains mostly unchanged.
- **Auth direction:**
  - Likely move auth back to Lucia for first-class SvelteKit integration.
  - Keep a clear fallback if we decide to stay on the existing JWT scheme for longer.

This plan is intentionally **phased** so we can migrate incrementally and keep the app usable throughout.

---

## 1. Current State (High-Level)

- **Framework:** SvelteKit 2 with `@sveltejs/adapter-node`.
- **Backend:**
  - Express app in `server/` (`index.js`, `routes/api.js`, plus `auth.js`, `groups.js`, `library.js`, `submissions.js`).
  - Custom middleware for uploads and image processing (Multer + Sharp) in `server/middleware/`.
  - AI validation and DB utilities in `server/utils/`.
- **SvelteKit server-side code:**
  - `src/lib/server/db.ts` and `src/lib/server/db/` with Drizzle setup and schema.
  - `src/lib/server/jwt.ts` for current auth/session logic.
- **Storage:**
  - AWS S3 via `@aws-sdk/client-s3`.
- **Plans already in play:**
  - `docs/PLAN-MVP.md` and `docs/PLAN-GROUPS.md` define gameplay, groups, and API behavior; those semantics must be preserved when we move the endpoints.

The big issue is **split logic**: Express owns most runtime behavior, while SvelteKit has its own server utilities. The migration plan focuses on consolidating this into SvelteKit-only code.

---

## 2. Phase 0 – Decisions & Groundwork

**Objective:** Clarify deployment target and constraints before touching runtime code.

- [ ] **Choose serverless target + adapter**
  - Decide whether we’re targeting Vercel, Netlify, Cloudflare, AWS Lambda, etc.
  - Based on that, swap `@sveltejs/adapter-node` to the appropriate serverless adapter.
  - Confirm any platform-specific limits (cold starts, max body size, request duration) that affect uploads and AI validation.

- [ ] **Confirm DB hosting story for SQLite**
  - Decide whether we keep a filesystem-based SQLite file (e.g., on a single node) or shift to a hosted option compatible with Drizzle (e.g., Postgres/libSQL/etc.).
  - Outcome for now: **keep the current SQLite + Drizzle setup**, but treat this as an implementation detail that may change in a later phase.

- [ ] **Audit and normalize environment variables**
  - List all env vars used by Express and SvelteKit:
    - DB connection (SQLite path), Gemini API key, S3 access/secret keys, bucket, region, any auth secrets.
  - Plan how these will be read in SvelteKit (`$env/static/private` / `$env/dynamic/private`).
  - Ensure names and semantics are consistent so we can remove the Express `dotenv` dependency later.

- [ ] **Decide on auth direction**
  - Option A (preferred): Lucia + Drizzle + SvelteKit hooks.
  - Option B: Keep existing JWT-based auth for a while, but refactor it into clean SvelteKit endpoints.
  - This decision controls how we design the login/logout endpoints in later phases.

---

## 3. Phase 1 – Consolidate Infrastructure into SvelteKit

**Objective:** Make SvelteKit the single home for shared concerns (DB, S3, AI), even before we delete Express. This reduces duplication and makes later endpoint migration straightforward.

### 3.1 Drizzle + DB consolidation

- [ ] **Treat `src/lib/server/db.ts` as the canonical DB entrypoint**
  - Ensure all schema and Drizzle clients live in `src/lib/server/db.ts` and `src/lib/server/db/`.
  - If `server/utils/database.js` has any logic that isn’t already in Drizzle land, port that behavior into SvelteKit’s DB layer.

- [ ] **Create a small DB access surface**
  - Design a minimal set of functions in `src/lib/server/db/` (e.g., `getUserById`, `createSubmission`, `getGroupLeaderboard`, etc.).
  - These should encapsulate raw queries so both SvelteKit endpoints and any temporary Express bridge code can call them.

### 3.2 S3 client utility

- [ ] **Extract S3 usage into `src/lib/server/s3.ts`**
  - Create a shared S3 client module that:
    - Configures the client once from env vars.
    - Exposes simple operations needed by the app (upload object, get object URL, delete object if needed).
  - Plan for this module to be imported by:
    - New SvelteKit endpoints.
    - Optionally, any transitional Express code if we keep Express alive during migration.

### 3.3 AI validation utility

- [ ] **Unify AI validation under SvelteKit**
  - Identify the Gemini validation logic in `server/utils/ai-validator.js`.
  - Create an equivalent module under `src/lib/server/ai-validator.ts`.
  - Ensure it:
    - Reads the Gemini API key from the SvelteKit env system.
    - Has a small, well-typed interface that endpoints can call.

### 3.4 Env handling

- [ ] **Move env access out of Express startup**
  - Replace Express’s `dotenv`-based env loading with SvelteKit’s env utilities.
  - Centralize any "required env" validation in a SvelteKit-only module (e.g., `src/lib/server/env.ts`) so we can fail fast at startup/build.

At the end of this phase, **SvelteKit has first-class utilities for DB, S3, AI, and env**, and Express is using them indirectly (or can be easily refactored to do so) if we choose to keep it temporarily.

---

## 4. Phase 2 – Authentication in SvelteKit (Lucia-first)

**Objective:** Move auth and session handling into SvelteKit, ideally with Lucia, so all subsequent API endpoints can rely on a SvelteKit-native user/session context.

### 4.1 Design the auth model

- [ ] **Confirm user identity fields and flows**
  - Reconcile existing behavior from current login/name entry flow with planned group-based behavior.
  - Decide how "login" works (e.g., name-based, email-based, magic links, etc.) consistent with the scavenger-hunt use case.

### 4.2 Implement Lucia integration (if chosen)

- [ ] **Set up Lucia core**
  - Add Lucia and any required adapter packages.
  - Define Lucia config in `src/lib/server/auth/lucia.ts`:
    - Drizzle adapter for SQLite.
    - User/session tables consistent with existing `users` schema (including `isAdmin` if present).

- [ ] **Wire SvelteKit hooks**
  - Implement `hooks.server.ts` to:
    - Read the session from cookies.
    - Attach `locals.user` / `locals.session` for use in endpoints.

- [ ] **Create auth endpoints and UI**
  - SvelteKit `+server.ts` handlers for login, logout, and session refresh.
  - Update `/login` page and layout logic to call these endpoints instead of Express.

### 4.3 Fallback: JWT-only path (if Lucia is deferred)

- [ ] **Refine `src/lib/server/jwt.ts` and related endpoints**
  - Implement SvelteKit login/logout endpoints that:
    - Validate credentials or name entry using Drizzle.
    - Mint/verify JWTs using the existing `jwt.ts` utilities.
  - Ensure all new SvelteKit API routes use a common auth guard that reads the JWT from cookies/headers.

Outcome: **Auth is fully handled by SvelteKit**, regardless of whether we are on Lucia or JWT. Express may still run some old routes, but it is no longer the source of truth for authentication.

---

## 5. Phase 3 – Migrate API Routes from Express to SvelteKit (Domain by Domain)

**Objective:** Move functionality in small, verifiable slices instead of a big-bang rewrite. For each domain, the pattern is: implement SvelteKit endpoint → dual-run or switch consumer → retire Express endpoint.

### 5.1 General migration pattern

For each API domain (auth/users, groups, submissions, library/tasks, uploads):

1. **Implement SvelteKit endpoint(s)** under `src/routes/api/.../+server.ts` using:
   - Drizzle utilities from `src/lib/server/db/`.
   - Auth/session from Lucia or JWT helpers.
   - S3 and AI modules from `src/lib/server/`.
2. **Wire the frontend to the SvelteKit endpoint**:
   - Update fetch calls in Svelte components (`+page.svelte`, `+layout.svelte`, `SubmissionModal.svelte`, etc.) to hit `/api/...` served by SvelteKit (same paths as before where possible).
3. **Verify behavior vs Express**:
   - Compare responses and behavior for key flows.
   - Use the existing group/leaderboard plans (`docs/PLAN-GROUPS.md`) as the contract.
4. **Retire the matching Express route** once the SvelteKit version is stable.

### 5.2 Auth & user endpoints

- [ ] **Port `/login` and related user endpoints**
  - Implement `src/routes/api/login/+server.ts` using the new auth model.
  - Implement `src/routes/api/users/[userId]/+server.ts` to return id, name, isAdmin, and any other required fields.
  - Ensure frontend layout logic (`+layout.svelte`) uses these endpoints to bootstrap user context.

### 5.3 Groups

- [ ] **Port group routes from Express to SvelteKit** in line with `docs/PLAN-GROUPS.md`:
  - `POST /api/groups` (admin-only create).
  - `GET /api/groups` (list groups).
  - `POST /api/groups/:groupId/join`.
  - `DELETE /api/groups/:groupId/members/:userId` (leave group).
  - `GET /api/users/:userId/groups` (memberships for a user).
- [ ] **Ensure group scoping semantics are preserved**:
  - Enforce that onboarding is blocked until the user is in at least one group.
  - Ensure `activeGroupId` is a first-class concept in layout/context.

### 5.4 Submissions & feed

- [ ] **Port submission creation endpoints (uploads)**
  - Implement SvelteKit endpoints for uploading images and creating submissions.
  - Use S3 client + AI validator utilities.
  - Ensure group scoping: submissions must always be tied to a `groupId` and the submitting user must be a member of that group.

- [ ] **Port leaderboard and feed endpoints**
  - `GET /api/submissions/all` or equivalent should:
    - For admins: allow cross-group view (if defined in the existing behavior).
    - For non-admins: auto-scope to user’s groups or a single active group, as defined in `PLAN-GROUPS.md`.
  - `GET /api/submissions/leaderboard` should always be group-scoped.

### 5.5 Library / tasks

- [ ] **Port task/library endpoints**
  - Implement endpoints for reading tasks/library content in SvelteKit.
  - Confirm they’re group-agnostic per current design (tasks are global).

### 5.6 File uploads and media handling

- [ ] **Replace Express+Multer with SvelteKit-friendly upload handling**
  - Implement file upload handling in SvelteKit endpoints, respecting serverless limits.
  - Stream or buffer uploads directly to S3 where possible.
  - Preserve any existing image processing (Sharp) behavior, or adjust if serverless platform constraints require it.

Outcome: **All API routes used by the frontend are served by SvelteKit.** Express may still exist in the repo, but nothing critical depends on it.

---

## 6. Phase 4 – Decommission Express and Switch to Serverless Deployment

**Objective:** Once the SvelteKit endpoints are complete and stable, remove Express from the critical path and configure the project for serverless deployment.

- [ ] **Stop using `pnpm server` in production flows**
  - Update `package.json` scripts so production deployment builds SvelteKit and runs it using the chosen serverless adapter, not the custom Node server.

- [ ] **Remove Express-only wiring**
  - Delete or archive `server/index.js` and the associated route/middleware files once they are no longer referenced.
  - Remove Express-specific dependencies from `package.json` (Express, Multer, cookie-parser, etc.), but only after confirming no code paths require them.

- [ ] **Update SvelteKit adapter configuration**
  - Replace `@sveltejs/adapter-node` in `svelte.config.js` with the chosen serverless adapter.
  - Add any platform-specific config (e.g., function regions, memory/time limits, image optimization paths).

- [ ] **Deployment pipeline**
  - Add/adjust deployment config for the chosen platform (e.g., Vercel/Netlify config, CI/CD scripts).
  - Ensure environment variables (DB, S3, auth secrets, Gemini) are correctly configured in the platform’s secret manager.

Outcome: The app runs purely via SvelteKit on a serverless platform, with no custom Express server.

---

## 7. Phase 5 – Optional Data Storage Evolution (Post-Migration)

**Objective:** After we’re stable on SvelteKit serverless, optionally evolve the underlying data storage without rewriting business logic.

- [ ] **Evaluate DB backends compatible with Drizzle**
  - Consider Postgres, libSQL/Turso, or other hosted options depending on operational needs.
  - Check Drizzle support and migration paths.

- [ ] **Abstract DB connection details**
  - Ensure all code outside the DB layer depends only on the high-level DB functions in `src/lib/server/db/`.
  - This allows switching from SQLite to another backend primarily by changing Drizzle config and running migrations.

- [ ] **Plan and execute migration** (if we switch)
  - Design DB migration path (schema migration, data copy, cutover).
  - Update env vars and Drizzle config to point at the new backend.
  - Verify all SvelteKit endpoints continue to function as expected.

---

## 8. Working Style & Safety Checks

- Work **incrementally**: finish one domain or slice before starting the next.
- Avoid large, atomic rewrites of everything at once; prefer small, verifiable changes.
- Keep the existing behavior defined in `docs/PLAN-MVP.md` and `docs/PLAN-GROUPS.md` as the contract when porting behavior.
- Use tests (where available) and manual checks to verify behavior after each phase.

This plan should give us a clear, stepwise path from the current Express-based backend to a SvelteKit-only, serverless-friendly architecture, while keeping SQLite+Drizzle and S3 and leaving room to evolve auth and data storage later.
