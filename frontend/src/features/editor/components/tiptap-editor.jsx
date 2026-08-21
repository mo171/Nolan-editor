"use client";

import React, { useEffect, useCallback, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Typography from "@tiptap/extension-typography";
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, 
  Trash2, 
  Check, 
  AlertCircle,
  BrainCircuit,
  Zap
} from "lucide-react";
import { useEditorContext } from "@/features/editor/context/editor-context";
import { EditorFormatToolbar } from "./editor-format-toolbar";
import { NolanLinter } from "../extensions/nolan-linter";
import { GhostText } from "../extensions/ghost-text";
import { useGhostText } from "@/hooks/useGhostText";
import { useNarrativeLinter } from "@/hooks/useNarrativeLinter";

// ─── NeuralHighlight — ephemeral Decoration-based highlighter ─────────────────
// Uses ProseMirror Decorations instead of real marks so transient highlights
// are NEVER serialised into HTML / persisted to localStorage or the backend.
const neuralHighlightKey = new PluginKey("neuralHighlight");

const NeuralHighlight = Extension.create({
  name: "neuralHighlight",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: neuralHighlightKey,
        state: {
          init() { return DecorationSet.empty; },
          apply(tr, set) {
            // Remove decorations on content change so stale highlights don't linger
            set = set.map(tr.mapping, tr.doc);
            const meta = tr.getMeta(neuralHighlightKey);
            if (meta?.add) {
              const deco = Decoration.inline(meta.add.from, meta.add.to, {
                class: "nolan-neural-highlight",
              });
              set = set.add(tr.doc, [deco]);
            }
            if (meta?.clear) {
              set = DecorationSet.empty;
            }
            return set;
          },
        },
        props: {
          decorations(state) {
            return neuralHighlightKey.getState(state);
          },
        },
      }),
    ];
  },
});

export function TiptapEditor({ onEditorReady }) {
  const params = useParams();
  const projectId = params?.projectId;

  const { activeScene, updateSceneContent, updateSceneMetadata, activeMode, setActiveSuggestion, setStudioPanelOpen, ghostTextEnabled, neuralStats } = useEditorContext();
  const ghostTimerRef = useRef(null);
  const editorRef = useRef(null);
  // Guard: prevents programmatic setContent() from firing updateSceneContent
  const isSettingContentRef = useRef(false);
  // Guard: prevents clearGhost from re-rendering when ghost is already empty
  const ghostIsEmptyRef = useRef(true);

  const onToken = useCallback((text) => {
    if (editorRef.current) {
      ghostIsEmptyRef.current = false;
      editorRef.current.commands.setGhostText(text);
    }
  }, []);

  const onAnalysisReady = useCallback((data) => {
    if (activeScene?.id && updateSceneMetadata) {
      updateSceneMetadata(activeScene.id, data);
    }
  }, [activeScene?.id, updateSceneMetadata]);

  const ghostOptions = React.useMemo(() => ({
    onToken,
    onAnalysisReady
  }), [onToken, onAnalysisReady]);

  const { requestGhost, clearGhost } = useGhostText(projectId, ghostOptions);

  const handleUpdate = useCallback(
    ({ editor }) => {
      // Skip if we're programmatically setting content (scene switch)
      if (isSettingContentRef.current) return;

      if (activeScene?.id) {
        updateSceneContent(activeScene.id, editor.getHTML());
      }
      
      // Stop any ongoing ghost stream if user types something.
      // Only call clearGhost when there's actually ghost text to clear
      // to avoid a React setState on every keystroke.
      if (!ghostIsEmptyRef.current) {
        ghostIsEmptyRef.current = true;
        clearGhost();
      } else {
        // Still clear the Tiptap decoration without a React re-render
        if (editorRef.current) editorRef.current.commands.clearGhostText();
      }
      
      // Ghostwriter Logic: Start Zen timer on inactivity
      if (ghostTimerRef.current) clearTimeout(ghostTimerRef.current);
      // The Ghost Text toggle in the topbar is the single source of truth.
      // This also required activeMode === "Creative", so enabling the toggle
      // in Thinking/Planning mode silently did nothing and gave no feedback.
      if (ghostTextEnabled) {
        ghostTimerRef.current = setTimeout(() => {
          // Send last ~30 words to context
          const text = editor.getText();
          const words = text.split(/\s+/);
          const cursorText = words.slice(-30).join(" ");
          
          ghostIsEmptyRef.current = false;
          requestGhost(cursorText, activeScene?.id);
        }, 3500); // 3.5s inactivity
      }
    },
    [activeScene?.id, updateSceneContent, requestGhost, clearGhost, ghostTextEnabled]
  );
  
  const handleSelectionUpdate = useCallback(({ editor }) => {
    // Check if cursor is inside a linter mark
    let foundLinter = null;
    const { from, to, empty } = editor.state.selection;
    
    editor.state.doc.nodesBetween(from, to, (node, pos) => {
      const marks = node.marks.filter((m) => m.type.name === "nolanLinter");
      if (marks.length > 0) {
        foundLinter = {
          id: marks[0].attrs.id,
          type: marks[0].attrs.type,
          message: marks[0].attrs.message,
          suggestion: marks[0].attrs.suggestion,
        };
        return false; // stop traversal inside this node
      }
    });

    if (foundLinter) {
      setActiveSuggestion(foundLinter);
      setStudioPanelOpen(true); // Open the side panel automatically to show the card
    }
  }, [setActiveSuggestion, setStudioPanelOpen]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: { HTMLAttributes: { class: "nolan-code-block" } },
      }),
      Placeholder.configure({
        placeholder: "Begin your story… let the words flow.",
        emptyNodeClass: "nolan-placeholder",
      }),
      CharacterCount,
      Underline,
      Highlight.configure({ multicolor: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Typography,
      NolanLinter,
      GhostText,
      NeuralHighlight,
    ],
    content: activeScene?.content || "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "nolan-prose focus:outline-none min-h-full",
        spellcheck: "false", // We use custom Nolan syntax linting
      },
    },
    onUpdate: handleUpdate,
    onSelectionUpdate: handleSelectionUpdate,
  });

  // Activate the background Grammar & Insight Engine
  useNarrativeLinter(editor, projectId, activeScene?.id);

  // Keep a ref of the editor for callbacks that need stable closure without re-renders
  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  // Expose editor to parent for character count etc.
  useEffect(() => {
    if (editor && onEditorReady) onEditorReady(editor);
  }, [editor, onEditorReady]);

  // Switch content when active scene changes
  useEffect(() => {
    if (editor && activeScene?.content !== undefined) {
      const current = editor.getHTML();
      if (current !== activeScene.content) {
        // Set the guard BEFORE setContent so the onUpdate callback skips
        // updateSceneContent during the programmatic content swap.
        isSettingContentRef.current = true;
        clearGhost();
        ghostIsEmptyRef.current = true;
        editor.commands.clearGhostText();
        // emitUpdate: false prevents onUpdate from firing entirely
        editor.commands.setContent(activeScene.content, false);
        // Release the guard after the current call stack unwinds
        requestAnimationFrame(() => {
          isSettingContentRef.current = false;
        });
      }
    }
  }, [activeScene?.id]);

  // Listen to Global Events from the Studio Panel for Apply/Reject
  useEffect(() => {
    const handleApply = (e) => {
      if (!editorRef.current) return;
      const editor = editorRef.current;
      const { id, suggestion } = e.detail;

      // Find the mark by ID and replace its content
      const { doc } = editor.state;
      let targetPos = -1;
      let targetSize = 0;

      doc.descendants((node, pos) => {
        if (node.isText) {
          const marks = node.marks.filter((m) => m.type.name === "nolanLinter" && m.attrs.id === id);
          if (marks.length > 0) {
            targetPos = pos;
            targetSize = node.nodeSize;
            return false;
          }
        }
      });

      if (targetPos !== -1 && suggestion) {
        editor.chain()
          .focus()
          .deleteRange({ from: targetPos, to: targetPos + targetSize })
          .insertContentAt(targetPos, suggestion)
          // The mark is naturally removed when the text is deleted.
          .run();
      } else if (targetPos !== -1) {
        editor.commands.unsetLinterMark(id);
      }
    };

    const handleReject = (e) => {
      if (!editorRef.current) return;
      editorRef.current.commands.unsetLinterMark(e.detail.id);
    };

    window.addEventListener('nolan-apply-suggestion', handleApply);
    window.addEventListener('nolan-reject-suggestion', handleReject);

    // Neural Highlight Listener
    // Uses ephemeral Decorations (via NeuralHighlight extension) so the transient
    // highlight is NEVER serialised into HTML content or saved to localStorage.
    const handleNeuralHighlight = (e) => {
      if (!editorRef.current) return;
      const editor = editorRef.current;
      const { type, time } = e.detail;

      let from = -1;
      let to = -1;

      if (type === 'hook') {
        const firstPara = editor.state.doc.firstChild;
        if (firstPara && firstPara.isTextblock) {
          from = 1;
          to = 1 + firstPara.nodeSize;
        }
      } else if (type === 'pacing' || (type === 'lull' && time)) {
        const charOffset = Math.floor(time * 15);
        const docSize = editor.state.doc.content.size;
        from = Math.max(1, Math.min(charOffset, docSize - 10));
        to = Math.min(from + 50, docSize);
      }

      if (from !== -1) {
        editor.commands.focus();
        editor.view.dispatch(editor.state.tr.scrollIntoView());

        // Apply ephemeral Decoration — this does NOT fire onUpdate and is never saved.
        const addTr = editor.state.tr.setMeta(neuralHighlightKey, { add: { from, to } });
        editor.view.dispatch(addTr);

        // Auto-clear after 4 seconds
        setTimeout(() => {
          if (editor.isDestroyed) return;
          const clearTr = editor.state.tr.setMeta(neuralHighlightKey, { clear: true });
          editor.view.dispatch(clearTr);
        }, 4000);
      }
    };

    window.addEventListener('nolan-highlight-neural', handleNeuralHighlight);

    return () => {
      window.removeEventListener('nolan-apply-suggestion', handleApply);
      window.removeEventListener('nolan-reject-suggestion', handleReject);
      window.removeEventListener('nolan-highlight-neural', handleNeuralHighlight);
    };
  }, []);

  // Legacy mouse handlers removed, we now route everything to the right side panel.
  const handleEditorClick = (e) => {
    // Retained for potential structural pinning
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <EditorFormatToolbar editor={editor} />

      {/* Breadcrumb + Mode Chips */}
      <div className="flex items-center justify-between px-6 py-2 border-b border-white/5 flex-shrink-0 bg-[#0e0e11]">
        <div className="flex items-center gap-1.5 text-xs text-white/30">
          <span className="hover:text-white/60 cursor-pointer transition-colors">
            {activeScene ? "Project" : ""}
          </span>
          <span className="text-white/15">›</span>
          <span className="hover:text-white/60 cursor-pointer transition-colors">Chapter</span>
          <span className="text-white/15">›</span>
          <span className="text-white/60">{activeScene?.title ?? "Scene"}</span>
          {activeScene && (
            <>
              <span className="text-white/15 ml-2">
                {/* 2 of N */}
                {activeScene.title}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full border transition-all duration-300 text-[10px] font-semibold ${
            activeMode === "Creative" 
              ? "bg-primary/10 border-primary/20 text-primary" 
              : activeMode === "Thinking"
              ? "bg-blue-500/10 border-blue-500/20 text-blue-400"
              : "bg-amber-500/10 border-amber-500/20 text-amber-400"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${activeMode === "Creative" ? "bg-primary animate-pulse" : activeMode === "Thinking" ? "bg-blue-400" : "bg-amber-400"}`} />
            {activeMode} Mode
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-semibold text-white/40 cursor-pointer hover:bg-white/10 transition-colors">
            Go Live
          </div>
        </div>
      </div>
      {/* Editor Content Area */}
      <div className="flex-1 overflow-y-auto bg-[#0e0e11] scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent relative" data-mode={activeMode}>
        <div 
          className={`mx-auto px-8 py-10 min-h-full transition-all duration-500 ${activeMode === "Creative" ? "max-w-4xl" : "max-w-3xl"}`}
          onClick={handleEditorClick}
        >
          <EditorContent editor={editor} className="min-h-[60vh] pb-32" />
        </div>
      </div>
    </div>
  );
}
