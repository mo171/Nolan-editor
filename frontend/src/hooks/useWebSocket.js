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
 *   sendMessage(data: object) — sends JSON to backend, returns whether it went out
 *   lastMessage — the last parsed JSON message from backend
 *   connectionStatus — "connecting" | "open" | "closed" | "error"
 */
export function useWebSocket(projectId, { onMessage } = {}) {
  const wsRef = useRef(null);
  const retryCountRef = useRef(0);
  const pingIntervalRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // The socket is created once per projectId. Capturing `onMessage` inside that
  // closure would freeze it at its first value — so as soon as the consumer's
  // callbacks change identity (a new onToken after a scene switch, say), every
  // ghost_token would be dispatched to a dead handler and the streamed
  // suggestion would never reach the editor. Read it through a ref instead.
  const onMessageRef = useRef(onMessage);
  // Lets the reconnect timer invoke the current connect() without connect
  // having to depend on itself.
  const connectRef = useRef(null);
  const isUnmountedRef = useRef(false);

  const [lastMessage, setLastMessage] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("closed");

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const connect = useCallback(() => {
    if (!projectId || isUnmountedRef.current) return;
    const readyState = wsRef.current?.readyState;
    if (readyState === WebSocket.OPEN || readyState === WebSocket.CONNECTING) return;

    setConnectionStatus("connecting");
    const ws = new WebSocket(`${WS_URL}/ws/${projectId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnectionStatus("open");
      retryCountRef.current = 0;
      // Keepalive ping every 30s
      clearInterval(pingIntervalRef.current);
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
        onMessageRef.current?.(data); // Bypass react batching for rapid streams
        setLastMessage(data);
      } catch (e) {
        console.warn("[WS] Failed to parse message", e);
      }
    };

    ws.onclose = (event) => {
      setConnectionStatus("closed");
      clearInterval(pingIntervalRef.current);

      // Attempt reconnect with exponential backoff (max 5 retries)
      if (
        !isUnmountedRef.current &&
        retryCountRef.current < MAX_RETRIES &&
        !event.wasClean
      ) {
        const delay = BASE_BACKOFF_MS * 2 ** retryCountRef.current;
        retryCountRef.current += 1;
        reconnectTimeoutRef.current = setTimeout(() => connectRef.current?.(), delay);
      }
    };

    ws.onerror = () => {
      setConnectionStatus("error");
    };
  }, [projectId]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    isUnmountedRef.current = false;
    // Opening the socket IS the external-system subscription this effect exists
    // for; connect() sets status to "connecting" as part of that handshake.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    connect();
    return () => {
      isUnmountedRef.current = true;
      clearInterval(pingIntervalRef.current);
      clearTimeout(reconnectTimeoutRef.current);
      wsRef.current?.close(1000, "component unmounted");
    };
  }, [connect]);

  // Deliberately dependency-free: reading the socket through the ref keeps this
  // callback stable, which keeps requestGhost (and the editor's onUpdate
  // handler that depends on it) from being rebuilt on every status change.
  const sendMessage = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
      return true;
    }
    console.warn("[WS] Cannot send — socket not open");
    return false;
  }, []);

  return { sendMessage, lastMessage, connectionStatus };
}
