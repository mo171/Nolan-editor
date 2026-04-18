"use client";

import { useEffect, useRef, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/store/authStore";

const LINT_DEBOUNCE_MS = 2500; // 2.5s to avoid choppy keystrokes

export function useNarrativeLinter(editor, projectId, activeSceneId) {
  const { session } = useAuth();
  const timerRef = useRef(null);
  // Store requestLint in a ref so the editor event listener is stable.
  // The onUpdate handler only reads from this ref, so it always has the latest
  // version of requestLint without needing to re-register on every dependency change.
  const requestLintRef = useRef(null);

  // Core background linter ping
  const requestLint = useCallback(async (text, startPos) => {
    if (!text || text.length < 5 || !projectId || !activeSceneId) return;

    try {
      const result = await apiFetch(
        `/api/scenes/${activeSceneId}/lint`,
        {
          method: "POST",
          body: JSON.stringify({ text, project_id: projectId }),
        },
        session?.access_token
      );
      
      const suggestions = result?.suggestions || [];
      console.log("[NolanLinter] Received suggestions:", suggestions);
      
      if (suggestions.length === 0 || !editor || editor.isDestroyed) return;

      let transaction = editor.state.tr;
      let docChanged = false;

      // Safety check: Document might have shrunk or changed since the async request began
      if (startPos > editor.state.doc.content.size) return;

      const $pos = editor.state.doc.resolve(startPos);
      const paragraph = $pos.nodeAfter;
      
      if (!paragraph || !paragraph.isTextblock) return;

      // CLEAR STALE MARKS in this paragraph range first
      transaction.removeMark(startPos, startPos + paragraph.nodeSize, editor.schema.marks.nolanLinter);
      docChanged = true;

      const textContent = paragraph.textContent;
      
      suggestions.forEach((s) => {
        if (!s.original_text) return;
        
        const matchIndex = textContent.indexOf(s.original_text);
        if (matchIndex === -1) {
          console.warn(`[NolanLinter] Could not find match for: "${s.original_text}" in "${textContent}"`);
          return;
        }

        let currentStringOffset = 0;
        let currentDocOffset = startPos + 1;
        let absoluteFrom = -1;
        
        paragraph.forEach((node, offset) => {
          const nextStringOffset = currentStringOffset + node.textContent.length;
          if (absoluteFrom === -1 && matchIndex >= currentStringOffset && matchIndex < nextStringOffset) {
            const localOffset = matchIndex - currentStringOffset;
            absoluteFrom = currentDocOffset + offset + localOffset;
          }
          currentStringOffset = nextStringOffset;
        });

        if (absoluteFrom !== -1) {
          const absoluteTo = absoluteFrom + s.original_text.length;
          console.log(`[NolanLinter] Applying mark: ${s.type} at ${absoluteFrom}-${absoluteTo}`);
          transaction.addMark(absoluteFrom, absoluteTo, editor.schema.marks.nolanLinter.create({ 
            id: s.id,
            type: s.type,
            message: s.reason,
            suggestion: s.suggestion
          }));
          docChanged = true;
        }
      });
      
      if (docChanged) {
        editor.view.dispatch(transaction);
      }
      
    } catch (error) {
      console.error("[useNarrativeLinter] Error:", error);
    }
  }, [projectId, activeSceneId, editor, session]);

  // Keep the ref in sync with the latest callback on every render
  useEffect(() => {
    requestLintRef.current = requestLint;
  }, [requestLint]);

  // Stable onUpdate — never recreated, reads requestLint via ref.
  // This means editor.on/off is only registered once per editor instance,
  // eliminating the stacked-listener choppiness bug.
  const onUpdate = useCallback(({ editor, transaction }) => {
    if (!transaction.docChanged) return;
    
    if (timerRef.current) clearTimeout(timerRef.current);
    
    const { from } = editor.state.selection;
    const resolvedPos = editor.state.doc.resolve(from);
    
    if (resolvedPos.parent.isTextblock) {
      const text = resolvedPos.parent.textContent;
      const startPos = resolvedPos.before();
      
      timerRef.current = setTimeout(() => {
        if (requestLintRef.current) requestLintRef.current(text, startPos);
      }, 1500);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // No deps — intentionally stable for the lifetime of the editor instance

  useEffect(() => {
    if (!editor) return;
    editor.on("update", onUpdate);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      editor.off("update", onUpdate);
    };
  }, [editor, onUpdate]);
}
