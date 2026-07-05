# ShopNest Support — Rishika

A multilingual, escalation-aware AI customer support agent for **ShopNest**, an e-commerce platform. Rishika handles Tier-1 queries (orders, returns, payments) in 10 languages (English, Hindi, French, Spanish, Arabic, Mandarin Chinese, Portuguese, German, Japanese, Russian) and automatically routes sensitive issues (fraud, security, PR) to the right human team with a structured internal handover summary.

---

## 1. Architecture

```
┌─────────────────┐        HTTPS         ┌──────────────────────────────┐        HTTPS        ┌───────────────┐
│                  │  POST /api/chat     │                              │  generateContent    │               │
│  Frontend (SPA)  │ ───────────────────▶│   Backend (Node.js/Express)  │────────────────────▶│  Gemini API   │
│  index.html      │                     │                              │                      │  (Google)     │
│  (chat UI)       │◀─────────────────── │  routes/  services/  config/ │◀──────────────────── │               │
└─────────────────┘   JSON reply         └──────────────────────────────┘   JSON response       └───────────────┘
```

**Why this shape:**
- The API key lives only on the backend (`.env`), never shipped to the browser — the previous single-file version leaked the key to anyone who viewed page source.
- Each backend concern is a separate module, so any one piece can be replaced without touching the rest:
  - `config/prompt.js` — Rishika's persona + company policy (edit this to rebrand or change tone)
  - `config/escalation.js` — deterministic keyword-based escalation tagging, independent of the LLM
  - `services/geminiService.js` — the only file that knows about Gemini's request format (swap providers by rewriting just this file)
  - `routes/chat.js` — HTTP layer: validation, rate limiting, orchestration
  - `server.js` — wiring + static file serving
- A simple in-memory rate limiter (`routes/chat.js`) protects the API key's quota from abuse; swap for Redis-backed limiting if scaling beyond a single instance.

### Request flow
1. Frontend sends the full chat history + latest message to `POST /api/chat`.
2. Backend rate-limits by IP, tags the message with `escalation.js` (for logging/analytics), then calls `geminiService.generateReply()`.
3. `geminiService` attaches the system prompt from `prompt.js` and calls Gemini.
4. Reply is returned to the frontend, which renders it — and if it contains a `🔧 HANDOVER SUMMARY` block, displays it as an internal-only escalation card.

---

## 2. Project structure

```
shopnest/
├── backend/
│   ├── config/
│   │   ├── prompt.js         # persona + policy + escalation prompt rules
│   │   └── escalation.js     # keyword-based escalation tagging
│   ├── services/
│   │   └── geminiService.js  # Gemini API integration (the only place the key is used)
│   ├── routes/
│   │   └── chat.js           # POST /api/chat
│   ├── server.js             # Express app entry point
│   ├── package.json
│   ├── .env.example          # copy to .env and fill in your key
│   └── .gitignore
├── frontend/
│   └── index.html            # chat UI (no API key, calls /api/chat)
└── README.md
```

---

## 3. Local setup

**Requirements:** Node.js 18+ (for built-in `fetch`)

```bash
cd backend
npm install
cp .env.example .env
# edit .env and paste your Gemini API key
npm start
```

Then open:
```
http://localhost:3000
```

The backend also serves the frontend as static files, so there's only **one server, one port, one URL** — no separate `python -m http.server` step needed anymore.

---

## 4. Getting a Gemini API key

1. Go to [Google AI Studio → API Keys](https://aistudio.google.com/app/apikey)
2. Create a key
3. Paste it into `backend/.env` as `GEMINI_API_KEY=...`

**Note on quota:** the free tier has per-model rate limits. This project defaults to `gemini-2.5-flash-lite`, which has a workable free-tier quota. You can change the model via the `GEMINI_MODEL` variable in `.env`.

---

## 5. Deployment (Render — free tier)

1. Push this project to a GitHub repo.
2. Go to [render.com](https://render.com) → New → Web Service → connect the repo.
3. Set:
   - **Root directory:** `backend`
   - **Build command:** `npm install`
   - **Start command:** `npm start`
4. Add an environment variable: `GEMINI_API_KEY` = your key.
5. Deploy. Render gives you a public URL (e.g. `https://shopnest-rishika.onrender.com`) — that's your live demo link for judges.

*(Vercel works too, but Vercel's serverless functions need small adjustments for a long-running Express app — Render's "Web Service" is the simplest match for this structure.)*

---

## 6. Scalability notes (for judges / future work)

- **Stateless backend:** no session state is stored server-side (chat history is passed by the client each request), so the backend can be horizontally scaled behind a load balancer with no sticky sessions needed.
- **Rate limiting:** currently in-memory per-instance; for multi-instance deployments, swap to a shared store (Redis) so limits apply globally.
- **Provider abstraction:** `geminiService.js` isolates the LLM provider — adding a fallback provider (e.g. if Gemini quota is hit, fall back to another model) is a contained change.
- **Escalation logging:** `escalation.js` currently just tags messages; in production this would write to a queue/DB (e.g. write escalated tickets to a support-ticket system via webhook).

---

## 7. Known limitations / next steps

- No persistent chat history / database yet — each session is client-side only.
- No authentication — anyone with the URL can chat (fine for a demo, not for production).
- No automated tests yet.
- Escalation routing is simulated (returns text describing the queue); a production version would integrate with a real ticketing system (Zendesk, Freshdesk, etc.) via webhook.
