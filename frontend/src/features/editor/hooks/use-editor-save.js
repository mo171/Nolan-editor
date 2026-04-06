"use client";

import { useCallback, useRef, useState } from "react";

/**
 * useEditorSave
 * Provides a debounced save function with status tracking.
 * @param {Function} saveFn - The actual save function to call
 * @param {number} delay - Debounce delay in ms (default: 1500)
 */
export function useEditorSave(saveFn, delay = 1500) {
  const [status, setStatus] = useState("saved"); // 'saved' | 'saving' | 'unsaved'
  const timerRef = useRef(null);

  const debouncedSave = useCallback(
    (data) => {
      setStatus("unsaved");
      if (timerRef.current) clearTimeout(timerRef.current);

      timerRef.current = setTimeout(async () => {
        setStatus("saving");
        try {
          await saveFn(data);
          setStatus("saved");
        } catch (err) {
          console.error("[EditorSave] Save failed:", err);
          setStatus("unsaved");
        }
      }, delay);
    },
    [saveFn, delay]
  );

  return { status, debouncedSave };
}
