"""
WebSocket Connection Manager
=============================
Manages active WebSocket connections per project.
Supports:
  - Multiple connections per project (future multi-user collaboration)
  - Typed message broadcasting
  - Graceful disconnect handling
"""

from __future__ import annotations
import json
from collections import defaultdict
from fastapi import WebSocket
import logging

logger = logging.getLogger("nolan.ws")


class ConnectionManager:
    def __init__(self):
        # {project_id: set of WebSocket connections}
        self._connections: dict[str, set[WebSocket]] = defaultdict(set)

    # ─── Connection lifecycle ─────────────────────────────────────────────────

    async def connect(self, project_id: str, websocket: WebSocket):
        await websocket.accept()
        self._connections[project_id].add(websocket)
        logger.info(f"[WS] Connected: project={project_id} total={len(self._connections[project_id])}")

    def disconnect(self, project_id: str, websocket: WebSocket):
        self._connections[project_id].discard(websocket)
        if not self._connections[project_id]:
            del self._connections[project_id]
        logger.info(f"[WS] Disconnected: project={project_id}")

    # ─── Send to single socket ────────────────────────────────────────────────

    async def send(self, websocket: WebSocket, message: dict):
        try:
            await websocket.send_text(json.dumps(message))
        except Exception as e:
            logger.warning(f"[WS] Send failed: {e}")

    # ─── Broadcast to all sockets in a project ────────────────────────────────

    async def broadcast(self, project_id: str, message: dict):
        dead: set[WebSocket] = set()
        for ws in self._connections.get(project_id, set()):
            try:
                await ws.send_text(json.dumps(message))
            except Exception:
                dead.add(ws)
        # Clean up dead connections
        for ws in dead:
            self.disconnect(project_id, ws)

    # ─── Typed broadcast helpers (match the protocol in the plan) ────────────

    async def push_analysis_ready(self, project_id: str, scene_id: str, analysis: dict):
        await self.broadcast(project_id, {
            "type": "analysis_ready",
            "scene_id": scene_id,
            **analysis,
        })

    async def push_arc_warning(self, project_id: str, warning: dict):
        await self.broadcast(project_id, {
            "type": "arc_warning",
            **warning,
        })

    async def push_consistency_issue(self, project_id: str, issue: dict):
        await self.broadcast(project_id, {
            "type": "consistency_issue",
            **issue,
        })

    async def push_ghost_token(self, websocket: WebSocket, token: str):
        await self.send(websocket, {"type": "ghost_token", "token": token})

    async def push_ghost_done(self, websocket: WebSocket):
        await self.send(websocket, {"type": "ghost_done"})

    async def push_error(self, websocket: WebSocket, message: str):
        await self.send(websocket, {"type": "error", "message": message})


# ─── Singleton ───────────────────────────────────────────────────────────────
manager = ConnectionManager()
