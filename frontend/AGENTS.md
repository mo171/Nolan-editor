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
