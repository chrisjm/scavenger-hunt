## **Architecture Overview**

### **Phase 1: Server & Infrastructure (Day 1)**

  * **VPS Prep:**
      * Ensure Node.js (LTS) is installed.
      * Install **PM2** (`npm i -g pm2`) to manage the process and keep it alive.
      * **Nginx Configuration:** You will need a specific block to handle WebSocket upgrades.
      * *Task:* specific Nginx config for `proxy_set_header Upgrade $http_upgrade;` and `proxy_set_header Connection "upgrade";`.
  * **Project Structure (Monorepo-ish):**
      * Since you are using Express for the backend, use the **SvelteKit Node Adapter** (`@sveltejs/adapter-node`).
      * Your `server.js` will look roughly like this:
        ```javascript
        import { handler } from './build/handler.js'; // SvelteKit build
        import express from 'express';
        import { Server } from 'socket.io';
        import { createServer } from 'http';

        const app = express();
        const server = createServer(app);
        const io = new Server(server);

        // API Routes & Socket logic go here...

        // Let SvelteKit handle everything else
        app.use(handler);

        server.listen(3000);
        ```

### **Phase 2: Data & State (Day 2)**

  * **SQLite Schema:**
      * Since you want strictness to vary, add a `prompt_strictness` or `validation_prompt` column to the `Tasks` table.
      * **Table: Tasks**
          * `id` (int)
          * `description` (text) - Displayed to user: "Find a Santa Hat"
          * `ai_prompt` (text) - Hidden, sent to Gemini: "A photo of a red and white Santa hat"
          * `min_confidence` (float) - e.g., 0.7 for loose, 0.9 for strict.
          * `unlock_date` (datetime)
  * **Image Storage:**
      * Create a local directory `/uploads`.
      * Serve this statically in Express: `app.use('/uploads', express.static('uploads'))`.
      * *Note:* Ensure you implement a basic file cleanup or maximize storage if you expect 10 users \* 10MB photos \* 20 days (approx 2GB).

### **Phase 3: The "Judge" (AI Implementation) (Day 3-4)**

  * **Gemini Flash Implementation:**
      * You need **Structured Output** (JSON). Don't parse text.
      * **Prompt Strategy:**
        ```text
        Role: You are a strict scavenger hunt judge.
        Task: Verify if the image contains: {ai_prompt}
        Output: Return JSON only: { "match": boolean, "confidence": float (0.0 to 1.0), "reasoning": "short string" }
        ```
      * *Tip:* Flash 2.0 is multimodal. You can pass the image buffer directly.
  * **The "Strictness" Slider:**
      * **Early Game (Low Strictness):** Prompt = "A photo containing {item}". Threshold = 0.6.
      * **Late Game (High Strictness):** Prompt = "A photo clearly showing {item} in the center, well lit". Threshold = 0.85.
      * **Logic:**
        ```javascript
        if (aiResponse.match && aiResponse.confidence >= task.min_confidence) {
             // Success
        }
        ```

### **Phase 4: The "Public Shaming" UI (Day 5)**

  * **Real-time Feed:**
      * When `socket.on('submission')` fires, push the new entry to a Svelte store.
      * **The Shame Component:**
          * If `match === true`: Show image with a green border + "Approved by AI".
          * If `match === false`: Show image with a **Red Border** + the AI's reasoning (e.g., *"I see a cat, not a reindeer. Nice try, Uncle Bob."*). This is the comedy gold of the app.
  * **Leaderboard:**
      * Simple `SELECT user_id, count(*) FROM submissions WHERE valid = 1 GROUP BY user_id`.

### **Phase 5: Deployment & PWA (Day 6)**

  * **Build & Deploy:**
      * Run `npm run build`.
      * Upload to VPS.
      * Start with PM2: `pm2 start server.js --name "scavenger"`.
  * **HTTPS:**
      * Use Certbot (`certbot --nginx`). Cameras often **will not work** on mobile browsers unless the site is served over HTTPS (security requirement for `navigator.mediaDevices`).
