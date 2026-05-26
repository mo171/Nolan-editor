"use client";

import { useCallback, useRef } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/store/authStore";

const DEBOUNCE_MS = 2000; // 2s after user stops typing

/**
 * useSaveScene — debounced PUT /api/scenes/{id}/content
 * Returns immediately so the editor is never blocked.
 * Backend fires the NLP pipeline in the background after saving.
 */
export function useSaveScene({ onSaving, onSaved, onError } = {}) {
  const timerRef = useRef(null);

  const saveScene = useCallback(
    (sceneId, content, projectId) => {
      // Validate UUID to avoid 400/500 errors on mock IDs (sc-1-1, etc)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sceneId);
      
      if (!sceneId || !projectId || !isUUID) {
        if (!isUUID && sceneId) {
          console.warn(`[useSaveScene] Skipping save for non-UUID scene logic: ${sceneId}`);
        }
        return;
      }

      // Signal "unsaved" immediately so topbar shows the indicator
      onSaving?.();

      if (timerRef.current) clearTimeout(timerRef.current);

      timerRef.current = setTimeout(async () => {
        try {
          await apiFetch(
            `/api/scenes/${sceneId}/content`,
            {
              method: "PUT",
              body: JSON.stringify({ content, project_id: projectId }),
            }
          );
          onSaved?.();
        } catch (err) {
          console.error("[useSaveScene] Save failed:", err.message);
          onError?.(err.message);
        }
      }, DEBOUNCE_MS);
    },
    [onSaving, onSaved, onError]
  );

  // Flush immediately (e.g. when user navigates away)
  const flushSave = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return { saveScene, flushSave };
}
