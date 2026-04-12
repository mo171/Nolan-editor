"""
Nolan AI Studio — FastAPI Application
=======================================
Entry point. Handles:
  - App lifespan (startup/shutdown): connects Redis, validates Supabase
  - CORS (frontend can connect)
  - Router wiring (REST + WebSocket)
  - Structured logging
  - Global 500 handler

Low Latency Stack:
  - Redis cache warms up at startup
  - All routes are async
  - NLP pipeline runs in background (never blocks HTTP)
  - WebSocket pushes results when ready (no polling needed)
"""

import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from lib.redis_client import cache
from lib.supabase import supabase

# Routers
from routers import projects, chapters, scenes, ws, characters, comics

# ─── Logging ─────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("nolan.app")


# ─── Lifespan (startup / shutdown) ───────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Runs at startup and shutdown.
    Startup: connect Redis, verify Supabase, load models, initialize Neo4j.
    Shutdown: gracefully close Redis and Neo4j connections.
    """
    logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    logger.info("  Nolan AI Studio — Starting up")
    logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

    # ── Redis connection ─────────────────────────────────────────────────────
    try:
        await cache.connect()
        logger.info("✅ Redis connected")
    except Exception as e:
        logger.warning(f"⚠️  Redis unavailable ({e}) — caching disabled, app will still run")

    # ── Supabase connectivity check ──────────────────────────────────────────
    try:
        # Simple health check — fetch 1 row from projects (no data needed)
        supabase.table("projects").select("id").limit(1).execute()
        logger.info("✅ Supabase connected")
    except Exception as e:
        logger.error(f"❌ Supabase connection failed: {e}")

    # ── Neo4j connection pool initialization ──────────────────────────────────
    try:
        from lib.neo4j_client import get_neo4j_driver
        driver = get_neo4j_driver()
        if driver:
            logger.info("✅ Neo4j connection pool initialized")
    except Exception as e:
        logger.warning(f"⚠️  Neo4j unavailable ({e}) — graph features disabled")

    # ── Phase 2+ model singleton loading ──────────────────────────────────────
    from services.nlp.pipeline import load_spacy
    try:
        load_spacy()
    except Exception as e:
        logger.warning(f"⚠️  spaCy model not loaded: {e} — run: python -m spacy download en_core_web_lg")


    logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    logger.info("  Server ready")
    logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

    yield  # ← app runs here

    # ── Shutdown ─────────────────────────────────────────────────────────────
    logger.info("Shutting down...")
    
    # Close Redis
    await cache.disconnect()
    logger.info("✅ Redis disconnected cleanly")
    
    # Close Neo4j driver
    try:
        from lib.neo4j_client import close_neo4j_driver
        close_neo4j_driver()
    except Exception as e:
        logger.warning(f"Neo4j cleanup warning: {e}")


# ─── App instance ─────────────────────────────────────────────────────────────

app = FastAPI(
    title="Nolan AI Studio API",
    description="Intelligent narrative structuring engine for screenwriters & storytellers",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)


# ─── CORS ─────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",   # Next.js dev
        "http://localhost:3001",
        # Add your production domain here later
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Request timing middleware (dev visibility) ───────────────────────────────

@app.middleware("http")
async def add_timing_header(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = (time.perf_counter() - start) * 1000
    response.headers["X-Response-Time-Ms"] = f"{elapsed_ms:.1f}"
    if elapsed_ms > 500:
        logger.warning(f"SLOW REQUEST {request.method} {request.url.path} → {elapsed_ms:.0f}ms")
    return response


# ─── Global error handler ─────────────────────────────────────────────────────

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "path": str(request.url.path)},
    )


# ─── Routers ─────────────────────────────────────────────────────────────────

app.include_router(projects.router)
app.include_router(chapters.router)
app.include_router(scenes.router)
app.include_router(characters.router)
app.include_router(comics.router)
app.include_router(ws.router)


# ─── Health check ─────────────────────────────────────────────────────────────

@app.get("/health", tags=["system"])
async def health():
    """Quick liveness check. Returns Redis status too."""
    redis_ok = cache._client is not None
    try:
        if redis_ok:
            await cache._client.ping()
    except Exception:
        redis_ok = False

    return {
        "status": "ok",
        "redis": "connected" if redis_ok else "unavailable",
        "version": "0.1.0",
    }


# ─── Dev entry point ──────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
