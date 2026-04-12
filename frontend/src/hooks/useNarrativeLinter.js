"use client";

import { useEffect, useRef, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/store/authStore";

const LINT_DEBOUNCE_MS = 2500; // 2.5s to avoid choppy keystrokes

export function useNarrativeLinter(editor, projectId, activeSceneId) {
  const { session } = useAuth();
  const timerRef = useRef(null);

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

      // We need to map string-based indices from textContent to absolute document positions.
      // This requires iterating through the nodes in the paragraph because each tag (bold, etc.) 
      // consumes a position in the absolute document offset.
      
      let transaction = editor.state.tr;
      let docChanged = false;

      // Get the paragraph node and its absolute start
      const $pos = editor.state.doc.resolve(startPos);
      const paragraph = $pos.nodeAfter;
      if (!paragraph || !paragraph.isTextblock) return;

      // CLEAR STALE MARKS in this paragraph range first
      transaction.removeMark(startPos, startPos + paragraph.nodeSize, editor.schema.marks.nolanLinter);
      docChanged = true; // Mark as changed so we dispatch the clear even if no new suggestions


      // Robust matching: Find all occurrences and match them
      const textContent = paragraph.textContent;
      
      suggestions.forEach((s) => {
        if (!s.original_text) return;
        
        // Find the index in the plain text
        const matchIndex = textContent.indexOf(s.original_text);
        if (matchIndex === -1) {
          console.warn(`[NolanLinter] Could not find match for: "${s.original_text}" in "${textContent}"`);
          return;
        }

        // Map matchIndex (string offset) to absolutePos (doc offset)
        // We iterate through the paragraph's children to find the correct offset
        let currentStringOffset = 0;
        let currentDocOffset = startPos + 1; // +1 for the start of the paragraph
        let absoluteFrom = -1;
        
        paragraph.forEach((node, offset) => {
          const nextStringOffset = currentStringOffset + node.textContent.length;
          
          if (absoluteFrom === -1 && matchIndex >= currentStringOffset && matchIndex < nextStringOffset) {
            // The match starts in this node
            const localOffset = matchIndex - currentStringOffset;
            absoluteFrom = currentDocOffset + offset + localOffset;
          }
          
          currentStringOffset = nextStringOffset;
        });

        if (absoluteFrom !== -1) {
          const absoluteTo = absoluteFrom + s.original_text.length;
          
          console.log(`[NolanLinter] Applying mark: ${s.type} at ${absoluteFrom}-${absoluteTo}`);
          
          // Apply mark
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

  const onUpdate = useCallback(({ editor, transaction }) => {
    // Only trigger if document changed (user typed)
    if (!transaction.docChanged) return;
    
    if (timerRef.current) clearTimeout(timerRef.current);
    
    // Find the paragraph the user is currently editing
    const { from } = editor.state.selection;
    const resolvedPos = editor.state.doc.resolve(from);
    
    // Check if it's a valid textblock
    if (resolvedPos.parent.isTextblock) {
      const text = resolvedPos.parent.textContent;
      const startPos = resolvedPos.before();
      
      // Clear previously active grammar marks in this block to simulate "re-checking"
      // Wait, we can optionally clear marks here if we want immediate feedback that it's checking.
      // Usually it's better to just overwrite them afterwards to prevent flicker.
      
      timerRef.current = setTimeout(() => {
        requestLint(text, startPos);
      }, 1500); // Reduced to 1.5s for better responsiveness
    }
  }, [requestLint]);

  useEffect(() => {
    if (!editor) return;
    editor.on("update", onUpdate);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      editor.off("update", onUpdate);
    };
  }, [editor, onUpdate]);
}
