# 📌 Nolan Editor - Agent Checkpoint & Project Map

## 🎯 Project Objective
Building the "Nolan AI Studio" - A highly sophisticated, 2026-era cinematic narrative structuring engine for storytellers, game-devs, and screenwriters.

## 🛠️ Stack & Dependencies

**Frontend (`frontend/`)**
- **Package Manager:** `pnpm`
- **Framework:** Next.js 16 (App Router)
- **Styling:** Vanilla Tailwind CSS + `shadcn/ui` components
- **Editor:** Tiptap 3 (ProseMirror) with custom ghost-text / linter extensions
- **Motion & Interaction:** `framer-motion`
- **Charts & Graph:** `recharts`, `@xyflow/react`
- **Iconography:** `lucide-react` (Strict Rule: No external CDN icons like Material Symbols)

**Backend (`backend/`)**
- **Framework:** FastAPI + uvicorn (Python 3.11), fully async
- **Data:** Supabase (Postgres + `pgvector` + auth), Redis cache, Neo4j graph
- **NLP:** spaCy `en_core_web_lg` (NER + SVO), BERT sentiment / emotion, DistilBART zero-shot arcs
- **RAG:** `sentence-transformers` embeddings into `pgvector`, dual-mode retriever (narrative + DNA)
- **LLM:** LangChain streaming over the OpenAI API (`gpt-4o-mini` by default), with one shared client in `services/llm/client.py`

See **Running the Project** below for setup.

## 🗂️ Repo Map (What’s What)
- **`frontend/`**: Main Next.js app (landing page, dashboard, project wizard, `/editor/[projectId]`).
- **`backend/`**: FastAPI service — REST routers, WebSocket, NLP/BERT pipeline, RAG, Neo4j graph.
  - `app.py` — entry point, lifespan, CORS, router wiring
  - `routers/` — REST + WS endpoints  ·  `services/` — NLP, BERT, RAG, LLM, graph, images
  - `lib/` — Supabase / Redis / Neo4j clients, WS manager, background worker
  - `migrations/` — SQL to apply in the Supabase SQL editor
- **`example/`**: Raw/static HTML prototypes used as design reference.

## 🎨 Design System: "Ethereal Manuscript"
- **Color Palette:** Pure Dark Mode only (`#0e0e11` base, `#ba9eff` primary neon purple, `#69daff` electric blue).
- **Glassmorphism:** Heavy use of `bg-white/5` or `bg-[#131316]/60` with `backdrop-blur`.
- **No-Line Rule:** Borders are substituted for background luminosity shifts or microscopic `border-white/5` rules to maintain absolute cleanliness.
- **Interactions:** "Physical" micro-interactions are heavily enforced. Elements don't just change color; they lift (`-translate-y-1`), scale (`scale-105`), press (`active:scale-95`), and cast colored drop-shadows on hover.

## 🏗️ Current Project State (Checkpoint 2 — 2026-04-06)

### ✅ Landing Page — COMPLETE
The landing page is fully modularized and running in `frontend/src/app/page.jsx`.
- **Hero (`frontend/src/components/landing-page/hero-section.jsx`)**: Constellation grid + typewriter + parallax timeline + floating studio mock UI.
- **Spotlight (`frontend/src/components/landing-page/cursor-spotlight.jsx`)**: Global mouse-driven radial spotlight for glass cards.
- **Sections**:
  - `visual-demo-section.jsx`
  - `bento-features.jsx`
  - `workflow-section.jsx`
  - `use-cases-section.jsx`
  - `final-cta.jsx`
  - `footer.jsx`

### ✅ Editor Page — INITIAL “STUDIO SHELL” IMPLEMENTED
There is now a real internal editor route at **`/editor`**.
- **Route**: `frontend/src/app/editor/page.jsx`
- **Layout**: 3-column studio layout (left outliner sidebar, center Tiptap editor, right “Nolan Studio” panel) + topbar + AI prompt bar.
- **State + Persistence**: `frontend/src/features/editor/context/editor-context.jsx`
  - Chapters/scenes model with active selection.
  - Debounced local persistence via `localStorage` (`nolan_editor_state`).
  - Save indicator state (`saved` / `saving` / `unsaved`).
- **Tiptap**: `frontend/src/features/editor/components/tiptap-editor.jsx`
  - StarterKit + underline/highlight/text-align/typography + placeholder + character count.
  - Scene switching rehydrates editor content; edits sync into context state.
  - Dark prose styling is in `frontend/src/app/globals.css` under `.nolan-prose`.
- **Editor UI Modules**:
  - `editor-topbar.jsx` (genre dropdown, mode pills, editable title, save indicator)
  - `editor-sidebar.jsx` (Outliner/Characters/Lore/Timeline tabs, add/delete/rename, animated expand/collapse)
  - `editor-format-toolbar.jsx` (rich formatting controls for Tiptap)
  - `editor-studio-panel.jsx` (right-side studio feature grid + quick actions)
  - `editor-ai-bar.jsx` (quick prompts + AI input; currently logs to console)

### ⚠️ Known Gaps / TODO (Accurate as of now)
1. **Authentication is still stubbed**: `frontend/src/features/common/Navbar.jsx` uses `const [isLoggedIn] = useState(false)`.
2. **No auth enforcement**: `frontend/src/middleware.js` declares `PROTECTED_ROUTES` but its body just returns `NextResponse.next()`, and no backend route validates the Supabase JWT — `user_id` is read straight from the request body.
3. **AI + Studio tools are UI-only**: “AI bar” + studio grid actions are placeholders.
4. **Icon rule drift**: `frontend/src/app/layout.jsx` currently loads Material Symbols from Google Fonts, even though the project rule is `lucide-react` only.

## 🧾 Change Log (From Git History)
- **`initl`**: Base repo scaffolding + `frontend/` Next.js + shadcn/ui component set + `next-app/` TS scaffold.
- **`landing-page created`**: Modular landing page sections + nav + design system notes.
- **`editor-page`**: `/editor` route + editor feature modules + Tiptap integration + editor context/local persistence.

## ▶️ Running the Project

Two processes: **FastAPI on `:8000`** and **Next.js on `:3000`**. Start the backend first — the
frontend calls it on mount and opens a WebSocket immediately.

### Prerequisites

| Tool    | Verified with | Notes |
|---------|---------------|-------|
| Node.js | v22.22.3      | Next 16 requires >= 20.9 |
| pnpm    | 10.28.1       | `pnpm-lock.yaml` is committed — don't use npm or yarn |
| Python  | 3.11          | `backend/.venv` is 3.11.0 |

### External services

Only Supabase and OpenRouter are hard requirements. Everything else degrades gracefully — the
backend logs a warning at startup and keeps running.

| Service  | Required | If missing |
|----------|----------|------------|
| Supabase | **Yes**  | `Supabase connection failed` at startup; every data route 500s |
| OpenAI   | **Yes**  | Every LLM + image feature fails: ghost text, chat, linter, comic, animatic, avatars |
| Redis    | No       | `Redis unavailable — caching disabled`; reads fall back to Supabase |
| Neo4j    | No       | `Neo4j unavailable — graph features disabled`; the graph canvas stays empty |

All LLM and image calls go directly to `api.openai.com` on a single `OPENAI_API_KEY`,
routed through `services/llm/client.py`. The project previously fanned text calls out
through OpenRouter; that is fully removed.

### 1. Database — once

Apply the SQL in `backend/migrations/` through the Supabase SQL editor **in this order**.
`db.sql` creates the tables everything else references, so alphabetical order will not work:

1. `db.sql` — core schema, `pgvector` extension, the `search_scene_embeddings` RPC
2. `db_migrations.sql`, then `_v2` through `_v8_neural_stats` in ascending order
3. `create_project_videos.sql`

### 2. Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows;  source .venv/bin/activate on macOS/Linux
pip install -r requirements.txt
python -m spacy download en_core_web_lg
```

Create `backend/.env` (see the table below), then run either:

```bash
python app.py                     # uvicorn on 0.0.0.0:8000 with --reload
uvicorn app:app --reload --port 8000
```

**First boot takes a few minutes.** The lifespan handler eagerly pre-loads four models — BERT
emotion, BERT sentiment, a DistilBART zero-shot arc detector, and a sentence-transformers
embedder — downloading them from HuggingFace on the first run. This is deliberate: loading them
lazily would put a 5–30s spike on the first request that needs each one. Wait for `Server ready`.

Smoke test:
- `http://localhost:8000/health` → `{"status":"ok","redis":"connected"|"unavailable",...}`
- `http://localhost:8000/docs` → OpenAPI explorer

### 3. Frontend

Create `frontend/.env` (table below), then:

```bash
cd frontend
pnpm install
pnpm dev
```

| Route | Page |
|-------|------|
| `/` | Landing page |
| `/login`, `/signup` | Supabase auth |
| `/dashboard` | Project grid |
| `/project` | New-project setup wizard |
| `/editor/[projectId]` | Editor — Tiptap, ghost text, studio panel, neural dashboard |
| `/editor/[projectId]/comic` | Comic workflow |

> **Port matters.** The backend's CORS allowlist in `app.py` is hardcoded to `localhost:3000`,
> `127.0.0.1:3000`, `192.168.29.224:3000` and `localhost:3001`. If Next.js starts on any other
> port, every API call fails CORS. Add the origin to `app.py` or free up `:3000`.

### Environment variables

**`backend/.env`**

| Variable | Required | Default | Used by |
|----------|----------|---------|---------|
| `SUPABASE_URL` | **Yes** | — | `lib/supabase.py` |
| `SUPABASE_ANON_KEY` | **Yes** | falls back to `SUPABASE_PUBLISHABLE_KEY` | `lib/supabase.py` |
| `OPENAI_API_KEY` | **Yes** | — | `services/llm/client.py` — every LLM + image call |
| `LLM_MODEL` | No | `gpt-4o-mini` | `services/llm/client.py::resolve_model` (a legacy `openai/` prefix is stripped automatically) |
| `IMAGE_MODEL`, `IMAGE_QUALITY`, `IMAGE_SIZE` | No | `1024x1024` for size | `services/images/visual_director.py` |
| `REDIS_URL` | No | `redis://localhost:6379` | `lib/redis_client.py` |
| `NEO4J_URI` | No | `bolt://localhost:7687` | `lib/neo4j_client.py` |
| `NEO4J_USER` | No | `neo4j` | `lib/neo4j_client.py` |
| `NEO4J_PASSWORD` | No | `password` | `lib/neo4j_client.py` |
| `SPACY_MODEL` | No | `en_core_web_lg` | `services/nlp/pipeline.py` |

`GEMINI_API_KEY`, `STABILITY_API_KEY` and `OPENROUTER_API_KEY` sit in the committed `.env` but
**no project code reads them** — the first two are leftovers from an abandoned video/image path,
and `OPENROUTER_API_KEY` is dead since the switch to calling OpenAI directly. Safe to delete.

**`frontend/.env`** — all four are read in `src/`:

| Variable | Default | Used by |
|----------|---------|---------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | `src/lib/api.js` |
| `NEXT_PUBLIC_WS_URL` | `ws://localhost:8000` | `src/hooks/useWebSocket.js` |
| `NEXT_PUBLIC_SUPABASE_URL` | — | `src/lib/supabase.js` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | — | `src/lib/supabase.js` |

### Optional local services

```bash
docker run -d --name nolan-redis -p 6379:6379 redis:7-alpine
docker run -d --name nolan-neo4j -p 7474:7474 -p 7687:7687 -e NEO4J_AUTH=neo4j/password neo4j:5
```

Once Neo4j is up, backfill the graph from existing Supabase data:

```bash
cd backend
.venv\Scripts\python.exe rebuild_neo4j_graph.py
```

### Checks

```bash
cd frontend
pnpm lint
```

```bash
cd backend
.venv\Scripts\python.exe -m compileall -q routers services lib tools app.py
```

### Troubleshooting

| Symptom | Cause |
|---------|-------|
| Startup sits on "Pre-loading BERT…" | First-run HuggingFace download. Let it finish; later boots are cached. |
| `spaCy model not loaded` warning | Run `python -m spacy download en_core_web_lg` inside the venv. |
| Ghost text never appears | Backend needs `OPENAI_API_KEY`; the WS also skips any request under 7 words, and the topbar Ghost Text toggle must be on. |
| LLM calls fail with `model_not_found` | `LLM_MODEL` is set to a model your key can't reach. `resolve_model()` strips a leading `openai/`, but the rest must be a real OpenAI model id. |
| LLM calls fail with HTTP 429 / quota | OpenAI billing — check usage limits on the API key. |
| Ghost text ignores your genre/premise | Shouldn't happen since the cold-cache DB fallback in `routers/ws.py`. If it does, check `/health` and look for the `[WS] Project setup loaded from DB` log line. |
| API calls fail with a CORS error | Next.js is not on an allowlisted port — see the port note above. |
| `redis: "unavailable"` on `/health` | Expected without Redis. The app works; hot reads just go to Supabase. |
