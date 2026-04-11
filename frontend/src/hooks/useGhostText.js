"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useWebSocket } from "./useWebSocket";

/**
 * useGhostText — consumes the WebSocket stream to deliver
 * token-by-token ghost text completions from the backend.
 *
 * Protocol from ws.py:
 *   FE → BE:  { type: "ghost_request", cursor_text, scene_id }
 *   BE → FE:  { type: "ghost_token",  token }     ← one per word/chunk
 *   BE → FE:  { type: "ghost_done"   }            ← stream complete
 *   BE → FE:  { type: "analysis_ready", scene_id, characters, locations, ... }
 *
 * Ghost text is accumulated in a ref (no re-renders per token)
 * and only committed to state when the stream is done or accepted.
 *
 * @param {string} projectId
 * @param {function} onToken - called with the accumulated text on every token
 * @param {function} onAnalysisReady - called with NLP data when analysis_ready arrives
 */
export function useGhostText(projectId, { onToken, onAnalysisReady } = {}) {
  const ghostBufferRef = useRef(""); // accumulates tokens without re-renders
  const [ghostText, setGhostText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  const handleMessage = useCallback((msg) => {
    switch (msg.type) {
      case "ghost_token": {
        // Accumulate in ref — no setState per token = zero editor lag
        ghostBufferRef.current += msg.token ?? "";
        if (onToken) onToken(ghostBufferRef.current);
        break;
      }

      case "ghost_done": {
        // Stream finished → commit the full buffer to state once
        setGhostText(ghostBufferRef.current);
        setIsStreaming(false);
        break;
      }

      case "ghost_skipped": {
        // Backend silently skipped — not enough text yet. Clear spinner quietly.
        setIsStreaming(false);
        ghostBufferRef.current = "";
        break;
      }

      case "analysis_ready": {
        // NLP pipeline finished — pass data up without touching ghost state
        if (onAnalysisReady) {
          onAnalysisReady(msg);
        }
        break;
      }

      case "error": {
        console.error("[GhostText] Backend error:", msg.message);
        setIsStreaming(false);
        ghostBufferRef.current = "";
        break;
      }

      default:
        break;
    }
  }, [onToken, onAnalysisReady]);

  const { sendMessage, connectionStatus } = useWebSocket(projectId, { onMessage: handleMessage });

  /** Trigger a ghost text generation request */
  const requestGhost = useCallback(
    (cursorText, sceneId) => {
      if (!cursorText?.trim() || !sceneId) return;
      ghostBufferRef.current = "";
      setGhostText("");
      setIsStreaming(true);
      sendMessage({ type: "ghost_request", cursor_text: cursorText, scene_id: sceneId });
    },
    [sendMessage]
  );

  /** Accept the ghost text (insert into editor) and clear */
  const acceptGhost = useCallback(() => {
    const accepted = ghostBufferRef.current || ghostText;
    ghostBufferRef.current = "";
    setGhostText("");
    setIsStreaming(false);
    return accepted;
  }, [ghostText]);

  /** Discard ghost text without inserting */
  const clearGhost = useCallback(() => {
    ghostBufferRef.current = "";
    setGhostText("");
    setIsStreaming(false);
  }, []);

  return {
    requestGhost,
    acceptGhost,
    clearGhost,
    ghostText,
    isStreaming,
    connectionStatus,
  };
}
