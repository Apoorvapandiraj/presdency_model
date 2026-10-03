# PUARAI — Presidency University Academic Regulations AI

A production-ready, citation-grounded RAG assistant for Presidency University's
academic regulations. Ask questions in **English, हिन्दी or ಕನ್ನಡ** (typed or
spoken) and get a **direct answer first** in plain language, followed by the
rule logic — with every claim linked to an exact **Clause ID, section title,
page number and verbatim handbook snippet** you can verify in the citation drawer.

## Feature highlights

- **Hero landing page** — fullscreen looping HTML5 `<video>` background
  (`autoPlay loop muted playsInline`), dark glassmorphism overlay
  (`bg-slate-950/70 backdrop-blur-md`), central search bar + action chips
  (*Attendance Shortage Condonation*, *CGPA 2nd Year Promotion*,
  *Make-Up Exam Grade Cap*, *Revaluation & Paper Seeing*, *Pointer calculation*).
- **Direct Answer First** — 1–3 plain sentences, then a short empathetic
  explanation of the rule logic. Verbatim PDF paragraphs are **never** returned
  in the conversation (a 12-word n-gram guard rejects LLM output that leaks).
- **Collapsible citation drawer** — Clause ID, section, page, document, match
  score and the verbatim snippet (copy-to-clipboard) for verification.
- **Trilingual UI + voice assistant** — full EN/HI/KN dictionary (compiler-enforced
  parity), Web Speech API STT/TTS, live waveform visualisation via the Web Audio
  API `AnalyserNode`.
- **Stage 1 — Intent & Terminology Normalization** (`server/queryAnalyzer.ts`):

  | Student slang | Canonical concept | Clause |
  |---|---|---|
  | `pointer`, `gpa` | CGPA | Clause 9.1 |
  | `year back`, `detain` | Academic Progression & Promotion Failure | Clause 14.1 |
  | `reval`, `paper seeing` | Answer Script Photocopy & Grade Review | Clause 12.2 |
  | `makeup`, `supply` | Make-Up Examination | Clause 13.1 |
  | `attendance`, `condonation` | Attendance Shortage Condonation | Clause 7.3 |

  (Hindi/Kannada script equivalents normalize identically.)
- **Stage 2 — Hybrid retrieval + grounded generation** (`server/ragEngine.ts`):
  MongoDB Atlas Vector Search **or** in-memory TF-IDF + cosine →
  Gemini 2.5 Flash (`temperature: 0.0`, JSON mode) → verbatim guard →
  citations. Automatic **local RAG fallback** (server and browser) whenever the
  LLM is rate-limited/unreachable, plus an **off-scope refusal guard**.
- **Token-bucket rate limiting**: 40 req/min/IP server-side
  (`server/rateLimiter.ts`) mirrored client-side (`client/src/lib/api.ts`).
- **Error resilience**: React `ErrorBoundary`, structured JSON errors
  (`400/404/429/500`), timeouts, and graceful degradation everywhere.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8, Tailwind CSS v4 (`@tailwindcss/vite`), Framer Motion, Lucide-React |
| Backend | Node.js ≥ 20, Express 5 (ESM + TypeScript), `dotenv`, `@google/genai` (Gemini 2.5 Flash) |
| Vector search | MongoDB Atlas Vector Search (768-dim Gemini embeddings) with in-memory TF-IDF + cosine fallback |
| Deployment | Vercel (frontend + `/api` function), Docker/Node container, any static+Node host |

## Repository structure

```
├── package.json                # npm workspaces + root dev/build/typecheck scripts
├── package-lock.json           # single lockfile for both workspaces
├── vercel.json                 # build/output + /api rewrite + security headers
├── Dockerfile                  # multi-stage Node container
├── .env.example                # GEMINI_API_KEY, MONGODB_URI, PORT, …
├── api/index.ts                # Vercel entry shim; preserves root /api routing
├── client/
│   ├── package.json            # frontend dependencies and workspace scripts
│   ├── tsconfig.json           # client TypeScript entry configuration
│   ├── tsconfig.app.json       # frontend + Vite config type-check (noEmit)
│   ├── vite.config.ts          # React + Tailwind, dist/public output, /api proxy
│   ├── index.html              # Vite entry (trilingual Google Fonts)
│   ├── public/                 # favicon; add campus-loop.mp4 for the hero video
│   └── src/
│       ├── App.tsx             # orchestrator: chat, drawer, voice, error states
│       ├── index.css           # Tailwind v4 + glassmorphism utilities
│       ├── i18n/translations.ts # EN / HI / KN dictionary (type-enforced parity)
│       ├── context/LanguageContext.tsx
│       ├── lib/api.ts          # API client + client-side 40/min token bucket
│       ├── lib/vectorStore.ts  # client-side TF-IDF fallback (shared corpus)
│       ├── lib/localRag.ts     # offline answers when the backend is unreachable
│       ├── lib/speech.ts       # Web Speech API helpers (STT + TTS)
│       └── components/         # Navbar, HeroSection, SearchBar, ChatPanel, etc.
└── server/
    ├── package.json            # independent backend dependencies and scripts
    ├── tsconfig.json           # backend build → server/dist
    ├── server.ts               # Express app, /api/ask, /api/health, static, errors
    ├── env.ts                  # backend environment loading
    ├── queryAnalyzer.ts        # Stage 1: slang → canonical terms, off-scope guard
    ├── ragEngine.ts            # Stage 2: retrieval → generation → fallback
    ├── vectorStore.ts          # Atlas Vector Search + local TF-IDF/cosine index
    ├── geminiClient.ts         # @google/genai wrapper (retries, timeouts, embeddings)
    ├── rateLimiter.ts          # token bucket: 40 requests / minute / IP
    ├── sessionStore.ts         # in-memory session state and conversation history
    ├── corpus.ts               # shared regulation corpus (also used by client fallback)
    ├── types.ts                # API contract types
    ├── api/index.ts            # Vercel Express handler
    └── scripts/seedVectorStore.ts  # npm run seed → Atlas embeddings
```
## Quick start

```bash
npm install
cp .env.example .env        # add GEMINI_API_KEY (MONGODB_URI optional)
npm run dev                 # client + Express API together
# client: http://localhost:5173  |  API: http://localhost:8787
```

Production:

```bash
npm run build               # build server + client workspaces
npm start                   # node server/dist/server.js (API + built frontend)
```

| Script | Purpose |
|---|---|
| `npm run dev` | Run both workspaces; Vite proxies `/api` to `http://localhost:8787` |
| `npm run dev:client` | Vite frontend on port 5173 |
| `npm run dev:server` | Express API via `tsx watch` |
| `npm run build` | Build the server and client workspaces |
| `npm start` | `node server/dist/server.js` (serves API + built client) |
| `npm run typecheck` | Type-check both workspaces |
| `npm run seed` | Embed the corpus into MongoDB Atlas Vector Search |

## API

`POST /api/ask`

```jsonc
{
  "query": "I'm Aarav, 3rd Year B.Tech. How many credits for Summer Term?",
  "language": "en",                       // "en" | "hi" | "kn"
  "sessionId": "3f6c…",                   // Phase 2: session state (30-min TTL)
  "profile": { "name": "Aarav", "program": "3rd Year B.Tech" },
  "history": [{ "role": "user", "text": "…" }]
}
```

Response `data` = `AskResult` plus `sessionId` and the merged `profile`
(server extracts name/program/semester from free text, e.g. “I'm Aarav,
3rd Year B.Tech”). New `kind: "onboarding"` warmly asks for Name, Program
and Semester when the profile is incomplete; every grounded answer is
prefixed with a contextual greeting (“Hi Aarav! …”) once a name is known.
Sessions live in memory (`server/sessionStore.ts`); the browser persists
sessionId/profile/history in localStorage (`client/src/lib/session.ts`).

```json
{
  "success": true,
  "data": {
    "kind": "answer",
    "directAnswer": "You must attend at least 75%...",
    "explanation": "The rule exists so genuine medical emergencies...",
    "citations": [
      { "clauseId": "Clause 7.3", "sectionTitle": "...", "page": 9,
        "document": "...", "snippet": "verbatim text...", "score": 0.228 }
    ],
    "intent": {
      "category": "attendance",
      "canonicalTerms": ["Attendance Shortage Condonation"],
      "suggestedClauseId": "Clause 7.3"
    },
    "engine": "gemini | local-fallback | guard",
    "language": "en",
    "latencyMs": 42
  }
}
```

Errors are always structured:
`{ "success": false, "error": { "code", "message", "status", "retryAfter?" } }`
with codes `INVALID_QUERY`, `INVALID_JSON`, `NOT_FOUND`, `RATE_LIMITED`,
`INTERNAL_ERROR`.

`GET /api/health` reports Gemini/vector-store configuration and corpus stats.

## Corpus & MongoDB Atlas Vector Search

The corpus (`server/corpus.ts`) contains verbatim excerpts of the official
**Presidency University Academic Regulations (Reg. No. PU/AC-13/16/11_2020)**
(presidencyuniversity.in) paired with independent paraphrases. Clause numbering
follows the PUARAI product scheme (14.1 promotion · 12.2 answer-script review ·
13.1 make-up) — adjust `clauseId` values if your handbook edition differs.

To enable Atlas Vector Search:

1. `npm run seed` (requires `GEMINI_API_KEY` + `MONGODB_URI`).
2. Create the search index on the `puarai_regulations` collection:

```json
{ "name": "puarai_vector_index",
  "fields": [
    { "type": "vector", "path": "embedding", "numDimensions": 768, "similarity": "cosine" },
    { "type": "string", "path": "clauseId" } ] }
```

Without `MONGODB_URI` everything still works via the local TF-IDF index.

## Deployment

- **Vercel**: `vercel.json` builds the app and rewrites `/api/*` → `api/index.ts`
  (the Express app is exported as the function handler and never calls
  `listen()` on import). The frontend build output is `client/dist/public`.
- **Docker / Node**: `docker build -t puarai . && docker run -p 8787:8787 puarai`
  runs a single container serving both the API and the built frontend.
- **Frontend-only hosts** (Netlify/Vercel static): set `VITE_API_BASE` to the
  deployed backend origin at build time.

## Notes & limitations

- The hero video loads from `public/campus-loop.mp4` (drop any looping MP4
  there); when it is missing, the animated gradient + aurora fallback renders.
- With no `GEMINI_API_KEY` the engine answers from curated clause summaries
  (`engine: "local-fallback"`) — still trilingual and fully cited.
- Rate limiting is in-memory per IP (single Node instance); swap in Redis for
  multi-region serverless deployments.
- PUARAI is a study aid, not an official ruling — always verify via the
  citations and the official handbook PDF linked in the footer.

