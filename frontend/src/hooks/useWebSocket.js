"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";
const MAX_RETRIES = 5;
const BASE_BACKOFF_MS = 1000;

/**
 * useWebSocket — persistent, auto-reconnecting WebSocket connection.
 *
 * Handles:
 *   - exponential backoff on disconnect
 *   - ping/pong keepalive (30s interval)
 *   - clean teardown on unmount
 *
 * Returns:
 *   sendMessage(data: object) — sends JSON to backend
 *   lastMessage — the last parsed JSON message from backend
 *   connectionStatus — "connecting" | "open" | "closed" | "error"
 */
export function useWebSocket(projectId, { onMessage } = {}) {
  const wsRef = useRef(null);
  const retryCountRef = useRef(0);
  const pingIntervalRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const [lastMessage, setLastMessage] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("closed");

  const connect = useCallback(() => {
    if (!projectId) return;
    const readyState = wsRef.current?.readyState;
    if (readyState === WebSocket.OPEN || readyState === WebSocket.CONNECTING) return;

    setConnectionStatus("connecting");
    const ws = new WebSocket(`${WS_URL}/ws/${projectId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnectionStatus("open");
      retryCountRef.current = 0;
      // Keepalive ping every 30s
      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ping" }));
        }
      }, 30_000);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "pong") return; // ignore keepalive responses
        if (onMessage) onMessage(data); // Bypass react batching for rapid streams
        setLastMessage(data);
      } catch (e) {
        console.warn("[WS] Failed to parse message", e);
      }
    };

    ws.onclose = (event) => {
      setConnectionStatus("closed");
      clearInterval(pingIntervalRef.current);

      // Attempt reconnect with exponential backoff (max 5 retries)
      if (retryCountRef.current < MAX_RETRIES && !event.wasClean) {
        const delay = BASE_BACKOFF_MS * 2 ** retryCountRef.current;
        retryCountRef.current += 1;
        reconnectTimeoutRef.current = setTimeout(connect, delay);
      }
    };

    ws.onerror = () => {
      setConnectionStatus("error");
    };
  }, [projectId]);

  useEffect(() => {
    connect();
    return () => {
      clearInterval(pingIntervalRef.current);
      clearTimeout(reconnectTimeoutRef.current);
      wsRef.current?.close(1000, "component unmounted");
    };
  }, [connect]);

  const sendMessage = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    } else {
      console.warn("[WS] Cannot send — socket not open:", connectionStatus);
    }
  }, [connectionStatus]);

  return { sendMessage, lastMessage, connectionStatus };
}
