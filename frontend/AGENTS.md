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
- **Components:** We are using **Shadcn UI** components. You must prioritize using existing Shadcn components (from `@/components/ui`) and adding new ones via `pnpm dlx shadcn@latest add <component>`.
- **Customization Rule:** Even when pixel-by-pixel matching and specific physical interactions (like `active:scale-95` or `framer-motion` animations) are requested, use Shadcn components as the base start whenever possible. Add the custom styles and animations on top of the Shadcn components rather than building completely from scratch and removing Shadcn from the picture.
- Always style and customize Shadcn components with the colors defined in our "Nolan A.I Studio" Ethereal Manuscript theme above.
<!-- END:nolan-ecosystem-rules -->

<!-- BEGIN:nolan-architecture-checkpoint-4 -->
# 📌 Nolan Editor - Agent Checkpoint 4 (Frontend App Shell Complete)

## 🏗️ Current Project State (Checkpoint 4 — 2026-04-09)

### ✅ The Frontend (`frontend/`)
The Next.js 16 (App Router) interface app shell is largely complete and ready for backend integration.
- **Landing Page (`/`)**: Fully implemented with custom `framer-motion` and bento-box layouts.
- **Authentication (`/login`, `/signup`)**: Fully integrated Supabase auth layer utilizing `react-hook-form` for input validation and a global `zustand` store (`store/authStore.js`) for persistent session management. The UI is custom-styled to the glassmorphism Ethereal theme.
- **Dashboard (`/dashboard`)**: A global workspace view with an animated collapsible sidebar and a masonry grid. Context state handles UI filtering.
- **Project Configuration (`/project`)**: A 4-step wizard mapping explicitly to the backend `projects.py` schema (`Basic Info`, `World Setup`, `The Cast`, `Conflict`). It isolates macro-level project settings from active writing tools. Features an interactive, collapsible floating AI Assistant panel that reacts to wizard steps.
- **Editor UI Route (`/editor`)**: A fully resizable 3-column layout built with `react-resizable-panels`. Contains Outliner (left), custom Tiptap prose canvas (center), and Nolan Studio features (right).
- **Current State Gap**: All screens rely heavily on `useState`, Context APIs, and `localStorage`. Zero API requests are currently being made to the FastAPI backend.

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

> **Frontend Implementation Note (Avoid Vercel AI SDK)**
> Do NOT use the Vercel AI SDK for frontend streaming. The Vercel SDK expects standard HTTP streams (like SSE) and cannot natively parse our multi-purpose JSON WebSocket messages without heavy hacking. 
> 
> **Recommended Approach:** Build a lightweight Native WebSocket Context Provider in React.
> ```jsx
> // Example logic for the frontend:
> const socket = new WebSocket('ws://localhost:8000/ws/project_id');
> socket.onmessage = (event) => {
>   const data = JSON.parse(event.data);
>   
>   if (data.type === "ghost_token") {
>      // Append chunk to your chat or Tiptap editor state
>      setGhostText(prev => prev + data.chunk);
>   } else if (data.type === "nlp_event") {
>      // Trigger character updates in sidebar
>   }
> };
> ```
> This approach provides total control over the 500ms low-latency LangChain stream without forcing Python WebSockets into Vercel's HTTP-based ecosystem.

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
