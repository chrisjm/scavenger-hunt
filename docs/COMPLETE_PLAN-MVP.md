### 🚨 Critical Blockers (Must Fix First)

1.  **The "User Identity" Crash**
    - **The Issue:** Your database schema enforces a foreign key constraint on `submissions.user_id` -> `users.id`.
    - **The Bug:** The frontend currently generates a random `userId` (`user-` + random) and sends it with the upload. It _never_ creates a corresponding entry in the `users` table.
    - **The Result:** When you try to upload a photo, SQLite will throw a `FOREIGN KEY constraint failed` error, and the upload will crash.
    - **The Fix:** You need a simple "Login/Name Entry" modal to register the user in the DB before they can play.

2.  **Code Duplication / Confusion**
    - You have AI and DB logic in **two places**: `server/utils/` (used by Express) and `src/lib/server/` (standard SvelteKit).
    - Currently, your Express server uses `server/utils`. You should stick to that for the API to avoid maintaining two copies of the Gemini logic.

---

### 📝 Remaining Phase-d Plan

#### **Phase 3.5: User Identity & Leaderboard (Priority)**

- [ ] **Create API Endpoint `/api/login`:**
  - Accepts a `name`.
  - Inserts into the `users` table (or retrieves existing).
  - Returns the `userId`.
- [ ] **Frontend "Name Entry" Modal:**
  - If `localStorage` has no `userId`, show a modal asking "Who are you?".
  - Save the response to `localStorage` and a Svelte store.
- [ ] **Leaderboard Component:**
  - Create a new API endpoint `/api/leaderboard` that runs `SELECT users.name, COUNT(*) as score FROM submissions WHERE valid=1 GROUP BY users.name`.
  - Add a visual Leaderboard to `+page.svelte` (swappable tabs with the Feed).

#### **Phase 4: Mobile & PWA Polish (Essential for Cameras)**

- [ ] **Install PWA Plugin:**
  - `npm install -D vite-plugin-pwa`.
- [ ] **Manifest Configuration:**
  - Configure `vite.config.ts` to generate `manifest.webmanifest`.
  - **Crucial:** Set `display: standalone` so the browser UI (URL bar) disappears, making it look like a real app. This gives more screen space for the camera view.
- [ ] **Mobile Layout Tweaks:**
  - The current UI has a lot of padding (`p-6`, `p-8`). On a phone, this wastes space. Reduce padding for mobile breakpoints (e.g., `p-4 md:p-8`).

#### **Phase 5: Deployment Prep**

- [ ] **Nginx Config:**
  - You need to write the `nginx.conf` block for your VPS that handles the WebSocket upgrade headers, otherwise `socket.io` will fall back to long-polling (slower).
- [ ] **Environment Secrets:**
  - Ensure your `.env` on the VPS has the production `DATABASE_URL` and `GEMINI_API_KEY`.

---
