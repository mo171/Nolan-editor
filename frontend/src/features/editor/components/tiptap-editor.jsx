"use client";

import React, { useEffect, useCallback, useState, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Typography from "@tiptap/extension-typography";
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
import { NarrativeCritique } from "../extensions/narrative-critique";
import { GhostText } from "../extensions/ghost-text";

export function TiptapEditor({ onEditorReady }) {
  const { activeScene, updateSceneContent, activeMode } = useEditorContext();
  const [hoveredCritique, setHoveredCritique] = useState(null);
  const hideTimeoutRef = useRef(null);
  const ghostTimerRef = useRef(null);

  const handleUpdate = useCallback(
    ({ editor }) => {
      if (activeScene?.id) {
        updateSceneContent(activeScene.id, editor.getHTML());
      }
      
      // Ghostwriter Logic: Start Zen timer on inactivity
      if (ghostTimerRef.current) clearTimeout(ghostTimerRef.current);
      if (activeMode === "Creative") {
        ghostTimerRef.current = setTimeout(() => {
          editor.commands.setGhostText("...and then, in the silence of the den,\na new shadow moved against the light.");
        }, 5000);
      } else {
        editor.commands.clearGhostText();
      }
    },
    [activeScene?.id, updateSceneContent, activeMode]
  );

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
      NarrativeCritique,
      GhostText,
    ],
    content: activeScene?.content || "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "nolan-prose focus:outline-none min-h-full",
        spellcheck: "true",
      },
    },
    onUpdate: handleUpdate,
  });

  // Expose editor to parent for character count etc.
  useEffect(() => {
    if (editor && onEditorReady) onEditorReady(editor);
  }, [editor, onEditorReady]);

  // Switch content when active scene changes
  useEffect(() => {
    if (editor && activeScene?.content !== undefined) {
      const current = editor.getHTML();
      if (current !== activeScene.content) {
        editor.commands.setContent(activeScene.content, false);
      }
    }
  }, [activeScene?.id]);

  // Robust Hover Critique Logic (Element-Anchored with Interaction Bridge)
  const handleMouseOver = (e) => {
    if (!editor) return;
    
    // Clear any pending hide timer
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);

    // Find the closest critique span
    const target = e.target.closest(".critique-violet, .critique-blue");
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const message = target.getAttribute("data-critique-message");
    const type = target.getAttribute("data-critique-type");

    // Don't re-trigger if same element
    if (hoveredCritique?.element === target) return;

    setHoveredCritique({
      element: target,
      message,
      type,
      x: rect.left + rect.width / 2,
      top: rect.top - 12,
    });
  };

  const handleMouseOut = (e) => {
    // Start a 200ms hide timer
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    hideTimeoutRef.current = setTimeout(() => {
      setHoveredCritique(null);
    }, 200);
  };

  const handleHudEnter = () => {
    // Cancel hide timer when mouse enters the HUD
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
  };

  const handleEditorClick = (e) => {
    // Optional: Lock/Pin logic here if needed
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
          onMouseOver={handleMouseOver}
          onMouseOut={handleMouseOut}
          onClick={handleEditorClick}
        >
          <EditorContent editor={editor} className="min-h-[60vh] pb-32" />
        </div>

        {/* Narrative Critique HUD (Anchor-based) */}
        <AnimatePresence>
          {hoveredCritique && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 8 }}
              transition={{ type: "spring", damping: 30, stiffness: 400 }}
              style={{ 
                left: hoveredCritique.x, 
                top: hoveredCritique.top,
                position: 'fixed' 
              }}
              className="z-[9999] -translate-x-1/2 -translate-y-full pb-4 pointer-events-auto"
              onMouseEnter={handleHudEnter}
              onMouseLeave={handleMouseOut}
            >
              <div className="bg-[#1a1a1f]/90 backdrop-blur-2xl border border-primary/20 rounded-2xl shadow-2xl shadow-primary/20 overflow-hidden ring-1 ring-white/10 w-[260px]">
                {/* Header */}
                <div className="bg-primary/5 px-3 py-2 flex items-center justify-between border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <BrainCircuit size={12} className="text-primary/70" />
                    <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em]">
                      Nolan Analyst
                    </span>
                  </div>
                  <div className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-[8px] font-black text-emerald-400 uppercase tracking-tighter">
                    Active
                  </div>
                </div>

                {/* Body */}
                <div className="p-4 pt-3">
                  <div className="flex gap-3 mb-4">
                    <AlertCircle size={14} className="text-primary/60 mt-0.5 flex-shrink-0" />
                    <div className="text-[11px] leading-relaxed text-white/70 font-medium italic">
                      {hoveredCritique.message || "Narrative integrity alert. Analyze context for better story beats."}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => {
                        const { element } = hoveredCritique;
                        // Use Tiptap to unset mark at the clicked span's actual position
                        const pos = editor.view.posAtDOM(element, 0);
                        editor.chain()
                          .focus()
                          .setTextSelection(pos)
                          .insertContent("[Nolan optimized this sentence...]")
                          .unsetCritique()
                          .run();
                        setHoveredCritique(null);
                      }}
                      className="flex items-center justify-center gap-2 py-2 rounded-xl bg-primary text-white text-[10px] font-black hover:bg-primary/90 transition-all active:scale-95 shadow-lg shadow-primary/20"
                    >
                      <Zap size={10} fill="white" />
                      Magic Fix
                    </button>
                    <button 
                      onClick={() => {
                        const { element } = hoveredCritique;
                        const pos = editor.view.posAtDOM(element, 0);
                        editor.chain().focus().setTextSelection(pos).unsetCritique().run();
                        setHoveredCritique(null);
                      }}
                      className="flex items-center justify-center gap-2 py-2 rounded-xl bg-white/5 border border-white/5 text-white/40 text-[10px] font-black hover:bg-white/10 active:scale-95 transition-all"
                    >
                      Ignore
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Connector Pin */}
              <div className="absolute left-1/2 -translate-x-1/2 bottom-3 w-2 h-2 bg-[#1a1a1f] border-r border-b border-primary/20 rotate-45" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Narrative Critique HUD (Bubble Menu fallback for selection) */}
        {editor && (
          <BubbleMenu 
            editor={editor} 
            options={{ 
              duration: 200, 
              animation: "shift-away",
              placement: "top-start",
              maxWidth: 320,
              offset: [0, 15]
            }} 
            shouldShow={({ editor }) => editor.isActive("narrativeCritique") && !hoveredCritique}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-[#1a1a1f]/95 backdrop-blur-2xl border border-primary/30 rounded-2xl shadow-2xl shadow-primary/20 overflow-hidden min-w-[280px]"
            >
              {/* Header */}
              <div className="bg-primary/10 px-3 py-2 flex items-center justify-between border-b border-primary/20">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-lg bg-primary/20 flex items-center justify-center">
                    <BrainCircuit size={12} className="text-primary" />
                  </div>
                  <span className="text-[10px] font-black text-white/80 uppercase tracking-widest">
                    Nolan Critique
                  </span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[8px] font-bold text-white/40">
                  <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                  Live AI
                </div>
              </div>

              {/* Body */}
              <div className="p-4">
                <div className="flex gap-3 mb-4">
                  <div className="flex-shrink-0 mt-0.5">
                    <AlertCircle size={14} className="text-primary" />
                  </div>
                  <div className="text-xs leading-relaxed text-white/70 italic">
                    {editor.getAttributes("narrativeCritique").message || 
                      "This sequence contains a character motivation drift. Ensure the Hare's logic remains consistent with his established fear of heights."}
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => {
                      // Mock Fix: Replace text or just remove highlight
                      editor.chain().focus().unsetCritique().run();
                    }}
                    className="flex items-center justify-center gap-2 py-2 rounded-xl bg-primary text-white text-[10px] font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                  >
                    <Zap size={11} fill="white" />
                    Accept Fix
                  </button>
                  <button 
                    onClick={() => editor.chain().focus().unsetCritique().run()}
                    className="flex items-center justify-center gap-2 py-2 rounded-xl bg-white/5 border border-white/10 text-white/50 text-[10px] font-bold hover:bg-white/10 hover:text-white/80 transition-all"
                  >
                    <Trash2 size={11} />
                    Dismiss
                  </button>
                </div>
              </div>
            </motion.div>
          </BubbleMenu>
        )}
      </div>
    </div>
  );
}
