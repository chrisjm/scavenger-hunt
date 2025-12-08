# Group-based Leaderboard & Multi-Group Support

## Main ideas and open questions answered

- **Per-group vs global scores**
  - We should be using per-group scores. Only per group leaderboards so we definitely need to separate these.

- **Leaving groups**
  - Allow for leaving a group (and rejoining, though same UI/UX).
  - Add `DELETE /api/groups/:groupId/members/:userId` and corresponding UI.

- **Global vs group views**
  - Group-scoped only views.

- **Admin management UI**
  - Only admins create, rename, and delete groups.

## 1. Goals

- **Group-scoped experience**
  - Make the scavenger hunt experience operate within a selected _group_ context.
  - Users can belong to multiple groups and switch their active group.
  - Leaderboard, community feed, and high-level stats should be viewable per group.
- **Admin-controlled group creation**
  - Only admins can create groups.
  - Non-admin users can join existing groups but cannot create new ones.
- **Onboarding requirement**
  - When a user joins the game (first login), they must input at least one group to join before accessing the main experience. Error if they input an invalid group name.

---

## 2. High-Level UX

- **Group selection & switching**
  - Add a persistent _Group Selector_ (likely in `Header` or `Sidebar`) that shows the current active group and allows switching between groups the user belongs to.
  - When switching groups, the main page reloads group-scoped data (leaderboard, feed, stats).

- **First-time user flow**
  - After login, if the user belongs to **no groups**:
    - Redirect to a "Join a Group" screen or show a blocking modal.
    - Display an input field for a group name with a _Join_ button.
    - If the user is an admin, also show a _Create Group_ form and a Select list of existing groups.

- **Admin group management**
  - Admins can create new groups via a minimal UI:
    - A button near the Group Selector (e.g. "➕ Add group") or a dedicated `/groups` admin section.
    - Form: group name (required), optional description.
    - After creation, admin is automatically added to that group and it becomes their active group.

- **Leaderboard & feed behavior**
  - `Leaderboard.svelte` should display scores **within the active group**.
  - Community feed and related stats should default to the active group (only show submissions from members of that group).
  - Optionally allow a "Global" view in future, but initial implementation can be strictly per-group.

---

## 3. Data Model & Permissions

### 3.1 New admin flag on users

- **Schema change (`src/lib/server/db/schema.ts`)**
  - Extend `users` table:
    - `isAdmin: integer('is_admin', { mode: 'boolean' }).notNull().default(false)`.
- **Behavior**
  - Admins are global; any admin can create groups.
  - Normal users have `isAdmin = false`.

- **How admins are designated**
  - Add an env var `ADMIN_USERNAMES="alice,bob"`.
  - During login, if `trimmedName` is in that list, set `isAdmin = true` on creation and return it.

### 3.2 New groups tables

- **`groups` table**
  - Represents logical groups that users can join.
  - Proposed schema:
    - `id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID())`
    - `name: text('name').notNull().unique()`
    - `description: text('description')` (optional)
    - `createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date())`
    - `createdByUserId: text('created_by_user_id').references(() => users.id)`

- **`userGroups` (many-to-many join) table**
  - Connects users to groups.
  - Proposed schema:
    - `id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID())`
    - `userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' })`
    - `groupId: text('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' })`
    - `joinedAt: integer('joined_at', { mode: 'timestamp' }).$defaultFn(() => new Date())`
    - Add a unique index on `(userId, groupId)` to prevent duplicate membership.

- **Relations**
  - `usersRelations` gets `groups: many(userGroups)`.
  - `groupsRelations` with `members: many(userGroups)`.
  - `userGroupsRelations` linking back to `users` and `groups`.

### 3.3 How groups scope existing data

- **Tasks**
  - Tasks remain global; all groups share the same task list.

- **Submissions & scores**
  - Submissions are still tied to `users` and `tasks` only (no `groupId` on submissions initially).
  - A group leaderboard is defined as:
    - _All valid submissions made by users who are members of that group_.
  - This means a user in multiple groups contributes their **same total score** to each group they belong to.

- **Future extension (optional, not in first pass)**
  - If we want scores to differ by group, we would add `groupId` to `submissions` and only count submissions made while the user is in that group.

---

## 4. Backend API Changes

### 4.1 Auth / login updates

- **Route:** `POST /login` (in `server/routes/api.js`)
  - Extend response payload to include `isAdmin`:
    - `{ userId, userName, isReturningUser, isAdmin }`.
  - On user creation, set `isAdmin` based on the `ADMIN_USERNAMES` env var (or similar strategy).

- **New route:** `GET /api/users/:userId`
  - Returns full user profile needed on the client:
    - `{ user: { id, name, isAdmin } }`.
  - `+layout.svelte` currently calls `/api/users/:id` in `fetchUserName`; update that endpoint (or implement it if missing) to also return `isAdmin`.

### 4.2 Group management routes

All routes live in a new groups router (e.g. `server/routes/groups.js`) and get mounted under `/api/groups`.

- **`GET /api/groups`**
  - Returns list of all groups:
    - `[{ id, name, description, memberCount? }]`.
  - Optionally include `memberCount` via a join/aggregation.

- **`POST /api/groups` (admin-only)**
  - Request body: `{ userId, name, description? }`.
  - Steps:
    - Fetch user by `userId` and ensure `isAdmin === true`.
    - Validate `name` (length, uniqueness).
    - Insert new group row.
    - Insert corresponding `userGroups` membership row for the creator.
    - Return created group.

- **`POST /api/groups/:groupId/join`**
  - Request body: `{ userId }`.
  - Steps:
    - Validate `groupId` and `userId` exist.
    - Check that `(userId, groupId)` is not already in `userGroups`.
    - Insert membership row.
    - Return updated memberships or the joined group.

- **`GET /api/users/:userId/groups`**
  - Returns the groups that the user belongs to:
    - `[{ id, name, description }]`.
  - Used by the client to:
    - Decide whether to show the "join group" onboarding.
    - Populate the group selector.

### 4.3 Group-scoped leaderboard & feed

- **Leaderboard: update existing route**
  - Current: `GET /api/submissions/leaderboard` in `server/routes/submissions.js`.
  - New behavior:
    - Accept optional `groupId` query param: `/api/submissions/leaderboard?groupId=...`.
    - If `groupId` is provided:
      - Join `userGroups` and filter to `userGroups.groupId = :groupId`.
      - Still require `submissions.valid = 1`.
      - Group and order by `users.name` as today.
    - If `groupId` is missing:
      - Either return global leaderboard (current behavior) or require a groupId (decision below). For now, keep backwards-compatible global behavior.

- **Feed: add optional group filter**
  - Current: `GET /api/submissions` returns all valid matches for feed.
  - New behavior:
    - Accept optional `groupId` query param.
    - If provided, join `userGroups` and filter to that `groupId`.
    - If omitted, default to global feed (backward compatible) or switch the frontend to always send `groupId`.

- **Stats endpoints (if added later)**
  - Any future stats APIs should take an optional `groupId` and mirror this filtering semantics.

---

## 5. Frontend Changes

### 5.1 User context extension

- **`+layout.svelte`**
  - Extend user state managed in layout:
    - Add `isAdmin: boolean | null`.
    - Add `userGroups: GroupSummary[]` (id, name, description).
    - Add `activeGroupId: string | null`.
  - Update `setContext('user', ...)` to expose:
    - Getters/setters for `userId`, `userName`, `isAdmin`.
    - Getters/setters for `activeGroupId` and possibly `userGroups`.

- **On mount flow**
  - After restoring `userId` from localStorage:
    - Call `GET /api/users/:userId` to populate `userName` and `isAdmin`.
    - Call `GET /api/users/:userId/groups` to fetch memberships.
    - Choose `activeGroupId`:
      - If localStorage has `scavenger-hunt-activeGroupId` that is still valid, use that.
      - Else, if user has groups, use the first one.
      - Else, route the user into the "Join a Group" flow.

- **Login page (`/login`)**
  - Update handling after successful login:
    - Store `isAdmin` from response in context (`userContext.isAdmin = data.isAdmin`) and optionally localStorage.
    - After redirect to `/`, the layout will continue by loading groups and deciding whether to show onboarding.

### 5.2 Group selection UI

- **GroupSelector component**
  - New component (e.g. `src/lib/components/GroupSelector.svelte`).
  - Props/context:
    - Uses `getUserContext()` to read `userGroups`, `activeGroupId`, `isAdmin`.
  - Behavior:
    - Render a dropdown or pill-style selector of groups.
    - On change, update `activeGroupId` in context and localStorage.
    - Optionally show current group in `Header` subtitle (e.g. "Group: Elves").
    - If `isAdmin`, show small "Add group" icon/button that opens the create-group UI.

- **Create / join group UI**
  - For first-time users (no groups):
    - Must use text input to join an existing group. Must validate that the group exists.
    - If `isAdmin`: Section "Create a new group" – name/description form.
  - For existing users:
    - The same UI can be accessible via a "Manage groups" button, i.e., able to add/join group through same UI (via exact text input).

### 5.3 Wiring group to data loading

- **Main page (`src/routes/+page.svelte`)**
  - Currently loads:
    - `/api/submissions`
    - `/api/tasks`
    - `/api/submissions/leaderboard`
  - Changes:
    - Track `activeGroupId` from `getUserContext()`.
    - Update `loadSubmissions` and `loadLeaderboard`:
      - If `activeGroupId` is set, call:
        - `/api/submissions?groupId=${activeGroupId}`
        - `/api/submissions/leaderboard?groupId=${activeGroupId}`
      - If not set (during initial onboarding), either:
        - Don’t load data until a group is selected, or
        - Fall back to global behavior (but likely unnecessary if onboarding is enforced).
    - Consider re-running loads when `activeGroupId` changes (reactive `$effect` watching the context value).

- **TabbedView & Leaderboard components**
  - `TabbedView.svelte` already accepts `leaderboard` and `submissions` props; just ensure the parent passes the group-filtered data.
  - `Leaderboard.svelte`:
    - Optionally accept a `groupName` prop or read it from context to display a small subtitle like "Leaderboard – Group Snowflakes".

### 5.4 Admin affordances

- **Conditional UI**
  - Anywhere we expose group creation, wrap it in an `isAdmin` check from user context.
  - Ensure non-admin users never see group creation controls, but can:
    - Join existing groups.
    - Switch between their groups.

---

## 6. Migrations & Operational Steps

1. **Update Drizzle schema**
   - Add `isAdmin` to `users`.
   - Create `groups` and `userGroups` tables with relations.

2. **Generate and run migrations**
   - Use drizzle-kit to generate new SQL.
   - Apply migrations to local and production databases.

3. **Seed initial data**
   - Create a few starter groups via a one-off script or directly via DB.
   - Designate at least one admin user (`isAdmin = true`) so they can manage groups via the UI.

4. **Deploy backend changes**
   - Deploy updated Express routes and schema.
   - Confirm new endpoints work via manual testing or simple API client.

5. **Deploy frontend changes**
   - Roll out updated layout, context, and group-related components.
   - Verify that:
     - New users are forced into group selection.
     - Existing users with groups get a sensible default active group.
     - Leaderboard and feed correctly filter by active group.
