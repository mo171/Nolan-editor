<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:nolan-design-rules -->
# Nolan A.I Studio Design System ("The Ethereal Manuscript")

## Core Palette (Dark Mode Only):
- Background (surface): `#0e0e11`
- Surface Container Low: `#131316`
- Surface Container Highest (Cards/Nodes): `#25252a`
- Primary: `#ba9eff` (ethereal lavender)
- Primary Gradient: `#ba9eff` to `#69daff`
- Typography: Display/Headlines (Manrope), Body/Interface (Inter)

## The "No-Line" Rule:
- No solid 1px borders to section off major UI areas. Define boundaries via background color shifts.
- Any floating panels use `surface_container` at 60% opacity with backdrop blur (Glassmorphism).

## UI/UX Specifics:
- Sidebar should be `surface_container_low` with a 1px gap from the Topbar.
- Active states & primary FABs should use the purple-to-blue gradient. Input fields should be understated using ghost borders.
<!-- END:nolan-design-rules -->

<!-- BEGIN:nolan-ecosystem-rules -->
# Tech Stack & Tooling Guidelines

- **Package Manager:** We use `pnpm` exclusively. Do not use `npm` or `yarn`. 
- **Components:** We are using **Shadcn UI** components. You must prioritize using existing Shadcn components (from `@/components/ui`) and adding new ones via `npx shadcn@latest add <component>` running via `pnpm dlx shadcn@latest add <component>`.
- Always style and customize Shadcn components with the colors defined in our "Nolan A.I Studio" Ethereal Manuscript theme above.
<!-- END:nolan-ecosystem-rules -->

<!-- BEGIN:nolan-architecture-checkpoint-3 -->
# 📌 Nolan Editor - Agent Checkpoint 3 (Backend Implementation Complete)

## 🏗️ Current Project State (Checkpoint 3 — 2026-04-07)

### ✅ The Frontend (`frontend/`)
The Next.js 16 (App Router) interface is ready for integration.
- **Landing Page**: Fully implemented with custom `framer-motion` and bento-box layouts.
- **Editor UI Route (`/editor`)**: A fully resizable 3-column layout built with `react-resizable-panels`. Contains Outliner (left), Tiptap prose canvas (center), and Nolan Studio features (right).
- **Current State Gap**: Currently uses browser `localStorage` and placeholder React contexts. It does not yet talk to the newly built Python backend APIs.

### ✅ The AI Backend (`backend/`)
We have built a highly sophisticated Python FastAPI intelligence engine. It runs low-latency features via parallel processing, WebSockets, and background tasks.

#### 1. Core API & Real-time Layer ⚡
- **Framework**: `FastAPI` + `Uvicorn`
- **REST Endpoints (`routers/`)**: Standard CRUD for `projects`, `chapters`, `scenes`, and `characters`. 
- **WebSocket Endpoint (`routers/ws.py`)**: A persistent `ws://.../ws/{project_id}` connection managed by `lib/ws_manager.py`. It is utilized strictly for instant LLM generations (Ghost Text) and NLP push notifications.
- **Async Execution**: `lib/worker.py` ensures that when users save scenes, the heavy AI extraction jobs run on background threads without blocking the HTTP responses or the UI.

#### 2. The Spacy NLP Pipeline 🧠 (Phase 2)
When a scene is saved (`PUT /api/scenes/{id}/content`), `tools/html_stripper.py` extracts pure narrative text. It is fed into `services/nlp/scene_processor.py`.
- **spaCy Model**: `en_core_web_lg` (loaded as singleton at boot).
- **Extraction**: Reads the text, identifies Locations and Characters, and resolves Subject-Verb-Object (SVO) relationships to catalog actions. It pushes this directly to Postgres & Neo4j.

#### 3. Ghost Text Generation & RAG 👻 (Phase 3 & 5)
Ghost Text is invoked via Frontend WebSocket `ws.send({ type: "ghost_request", cursor_text: "..." })`. It utilizes a low-latency RAG approach:
- **Embedding**: `services/rag/indexer.py` uses local `sentence-transformers/all-MiniLM-L6-v2` to mathematically map text chunks into 384-dimensional vectors.
- **Vector DB**: Chunks are stored in **Supabase pgvector**. 
- **Retrieval**: `services/rag/retriever.py` queries Supabase via RPC for parallel narrative context ("what happened before") and DNA context ("what writing style should I copy").
- **LangChain Generator**: `services/llm/chain.py` uses `gpt-4o-mini` with `streaming=True`. Token chunks are yielded directly to the WebSocket as they are created for ~500ms TTFB perceived latency.

#### 4. The Neo4j Knowledge Graph 🕸️ (Phase 6)
- **Data Model**: Maps `(Character)-[:APPEARS_IN]->(Scene)` and tracks chronological character timelines.
- **Data Querying**: Exposed via `routers/characters.py` (fetching both Graph timelines and Postgres cards), as well as natively queryable via `services/graph/graphql_schema.py` constructed with Strawberry GraphQL.

#### 5. BERT Emotion Stubs 🎭 (Phase 4)
- **Classifiers**: `sentiment_analyzer.py` and `emotion_classifier.py` are structurally implemented and fully wired into the dataflow, but currently stubbed (returning "neutral") to save 2GBs of development RAM overhead. 

## 🛠️ Required Setup Keys
If spinning up a fresh environment, ensure `backend/.env` contains:
- `SUPABASE_URL` and `SUPABASE_ANON_KEY`
- `OPENAI_API_KEY`
- `REDIS_URL` (Optional, app continues fine without it)
- `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`

Ensure you install dependencies via `.venv\Scripts\pip install -r requirements.txt` and download Spacy via `python -m spacy download en_core_web_lg`.
<!-- END:nolan-architecture-checkpoint-3 -->
