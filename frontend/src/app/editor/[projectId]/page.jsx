"use client";

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from "lucide-react";
import { EditorProvider, useEditorContext } from "@/features/editor/context/editor-context";
import { EditorTopbar } from "@/features/editor/components/editor-topbar";
import { EditorSidebar } from "@/features/editor/components/editor-sidebar";
import { TiptapEditor } from "@/features/editor/components/tiptap-editor";
import { EditorStudioPanel } from "@/features/editor/components/editor-studio-panel";
import { EditorAiBar } from "@/features/editor/components/editor-ai-bar";
import { BeatSheet } from "@/features/editor/components/beat-sheet";
import KnowledgeGraphCanvas from "@/features/editor/components/knowledge-graph-canvas";
import { useParams } from "next/navigation";

function SidebarToggle({ side }) {
  const { sidebarOpen, setSidebarOpen, studioPanelOpen, setStudioPanelOpen } = useEditorContext();
  const isLeft = side === "left";
  const isOpen = isLeft ? sidebarOpen : studioPanelOpen;
  const toggle = isLeft ? () => setSidebarOpen((v) => !v) : () => setStudioPanelOpen((v) => !v);

  const Icon = isLeft
    ? isOpen ? PanelLeftClose : PanelLeftOpen
    : isOpen ? PanelRightClose : PanelRightOpen;

  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={toggle}
      className={`absolute top-1/2 -translate-y-1/2 z-30 w-5 h-10 flex items-center justify-center rounded-full bg-[#1a1a1f] border border-white/10 text-white/30 hover:text-white/70 hover:border-white/20 transition-all shadow-lg
        ${isLeft ? "-right-2.5" : "-left-2.5"}`}
    >
      <Icon size={11} />
    </motion.button>
  );
}

function EditorLayout() {
  const { sidebarOpen, studioPanelOpen, activeMode, activeView } = useEditorContext();
  const [tiptapEditor, setTiptapEditor] = useState(null);
  const params = useParams();
  const projectId = params?.projectId;

  const handleEditorReady = useCallback((editor) => {
    setTiptapEditor(editor);
  }, []);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#0e0e11] font-sans">
      {/* Topbar */}
      <EditorTopbar />

      {/* Main 3-column layout */}
      <div className="flex flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {activeView === 'graph' ? (
            <motion.div
              key="graph-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10"
            >
              <KnowledgeGraphCanvas projectId={projectId} />
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Left Sidebar - Always visible unless specifically closed, but dimmed if in graph */}
        <div className={`relative flex-shrink-0 transition-opacity duration-500 ${activeView === 'graph' ? 'opacity-20 hover:opacity-100' : 'opacity-100'}`}>
          <EditorSidebar />
          <SidebarToggle side="left" />
        </div>

        {/* Center Editor Area */}
        <main className={`flex-1 flex flex-col overflow-hidden min-w-0 relative transition-all duration-500 ${activeView === 'graph' ? 'blur-xl scale-95 opacity-0' : 'blur-0 scale-100 opacity-100'}`}>
          <AnimatePresence mode="wait">
            {activeMode === "Planning" ? (
              <motion.div
                key="beat-sheet"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 flex flex-col min-h-0"
              >
                <BeatSheet />
              </motion.div>
            ) : (
              <motion.div
                key="tiptap"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex-1 flex flex-col min-h-0"
              >
                <TiptapEditor onEditorReady={handleEditorReady} />
                <EditorAiBar />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Right Studio Panel */}
        <div className={`relative flex-shrink-0 transition-all duration-500 ${activeView === 'graph' ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}`}>
          <SidebarToggle side="right" />
          <EditorStudioPanel />
        </div>
      </div>
    </div>
  );
}

export default function EditorPage() {
  return (
    <EditorProvider>
      <EditorLayout />
    </EditorProvider>
  );
}