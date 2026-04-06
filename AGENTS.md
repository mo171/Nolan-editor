# 📌 Nolan Editor - Agent Checkpoint & Project Map

## 🎯 Project Objective
Building the "Nolan AI Studio" - A highly sophisticated, 2026-era cinematic narrative structuring engine for storytellers, game-devs, and screenwriters.

## 🛠️ Stack & Dependencies
- **Package Manager:** `pnpm`
- **Framework:** Next.js 16 (App Router, inside `frontend/`)
- **Styling:** Vanilla Tailwind CSS + `shadcn/ui` components
- **Motion & Interaction:** `framer-motion`
- **Iconography:** `lucide-react` (Strict Rule: No external CDN icons like Material Symbols)

## 🗂️ Repo Map (What’s What)
- **`frontend/`**: Main Next.js app (landing page + `/editor` route).
- **`backend/`**: Placeholder folder (currently empty).
- **`example/`**: Raw/static HTML prototypes used as design reference.
- **`next-app/`**: Separate create-next-app TypeScript scaffold (not wired into `frontend/`).

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
2. **No backend yet**: `backend/` is empty; editor data is currently local-only.
3. **AI + Studio tools are UI-only**: “AI bar” + studio grid actions are placeholders.
4. **Icon rule drift**: `frontend/src/app/layout.jsx` currently loads Material Symbols from Google Fonts, even though the project rule is `lucide-react` only.

## 🧾 Change Log (From Git History)
- **`initl`**: Base repo scaffolding + `frontend/` Next.js + shadcn/ui component set + `next-app/` TS scaffold.
- **`landing-page created`**: Modular landing page sections + nav + design system notes.
- **`editor-page`**: `/editor` route + editor feature modules + Tiptap integration + editor context/local persistence.

## ▶️ Run / Smoke Test
From `frontend/`:
1. `pnpm install`
2. `pnpm dev`

Then open:
- Landing: `http://localhost:3000/`
- Editor: `http://localhost:3000/editor`
