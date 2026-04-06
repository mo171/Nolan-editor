"use client";

import React, { useEffect, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Typography from "@tiptap/extension-typography";
import { useEditorContext } from "@/features/editor/context/editor-context";
import { EditorFormatToolbar } from "./editor-format-toolbar";

export function TiptapEditor({ onEditorReady }) {
  const { activeScene, updateSceneContent, activeChapterId } = useEditorContext();

  const handleUpdate = useCallback(
    ({ editor }) => {
      if (activeScene?.id) {
        updateSceneContent(activeScene.id, editor.getHTML());
      }
    },
    [activeScene?.id, updateSceneContent]
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
    ],
    content: activeScene?.content ?? "",
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeScene?.id]);

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
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-semibold text-primary">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Creative Mode
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-semibold text-white/40">
            Go Live
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-semibold text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Saved
          </div>
        </div>
      </div>

      {/* Editor Content Area */}
      <div className="flex-1 overflow-y-auto bg-[#0e0e11]">
        <div className="max-w-3xl mx-auto px-8 py-10 min-h-full">
          <EditorContent editor={editor} className="min-h-[60vh]" />
        </div>
      </div>
    </div>
  );
}
