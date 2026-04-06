"use client";

import React from "react";
import { motion, Reorder, useDragControls, AnimatePresence } from "framer-motion";
import { 
  Users, 
  MessageSquare, 
  LayoutGrid, 
  GripVertical,
  Plus,
  ArrowRight
} from "lucide-react";
import { useEditorContext } from "@/features/editor/context/editor-context";

export function BeatSheet() {
  const { 
    activeChapter, 
    reorderScenes, 
    activeSceneId, 
    setActiveScene,
    addScene 
  } = useEditorContext();

  if (!activeChapter) return null;

  const scenes = activeChapter.scenes;

  return (
    <div className="flex-1 overflow-y-auto bg-[#0e0e11] bg-blueprint scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent p-8 md:p-12">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-16">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h2 className="text-3xl font-black text-white/90 flex items-center gap-4 tracking-tighter italic">
              <div className="p-2.5 rounded-2xl bg-primary/10 border border-primary/20 shadow-2xl shadow-primary/10">
                <LayoutGrid className="text-primary" size={26} />
              </div>
              {activeChapter.title}
            </h2>
            <p className="text-sm text-white/25 mt-2 font-semibold flex items-center gap-2">
              Blueprint Mode
              <ArrowRight size={12} className="text-white/10" />
              Analyze and restructure your narrative sequence.
            </p>
          </motion.div>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => addScene(activeChapter.id)}
            className="flex items-center gap-2.5 px-6 py-3 bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary rounded-2xl text-sm font-black transition-all shadow-2xl shadow-primary/5 active:scale-95 group"
          >
            <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
            Add Beat
          </motion.button>
        </div>

        {/* Reorder Group */}
        <Reorder.Group 
          axis="y" 
          values={scenes} 
          onReorder={(newOrder) => reorderScenes(activeChapter.id, newOrder)}
          className="flex flex-col gap-5 select-none"
        >
          <AnimatePresence initial={false}>
            {scenes.map((scene, index) => (
              <BeatCardContent 
                key={scene.id}
                scene={scene}
                index={index}
                activeChapterId={activeChapter.id}
                activeSceneId={activeSceneId}
                setActiveScene={setActiveScene}
              />
            ))}
          </AnimatePresence>
        </Reorder.Group>
      </div>
    </div>
  );
}

// Sub-component for individual card with its own drag controls
function BeatCardContent({ scene, index, activeChapterId, activeSceneId, setActiveScene }) {
  const dragControls = useDragControls();
  const isActive = activeSceneId === scene.id;

  return (
    <Reorder.Item
      value={scene}
      dragListener={false}
      dragControls={dragControls}
      layout
      style={{ boxShadow: isActive ? "0 20px 50px rgba(0,0,0,0.5)" : "none" }}
      className={`relative group bg-[#131316]/60 backdrop-blur-3xl border rounded-3xl p-6 transition-all duration-500 ease-out ${
        isActive 
          ? "border-primary/50 bg-[#17171d]/90 z-10" 
          : "border-white/5 hover:border-white/10 hover:bg-[#15151b] z-0"
      }`}
      onClick={() => setActiveScene(activeChapterId, scene.id)}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ 
        type: "spring", 
        stiffness: 400, 
        damping: 40,
        opacity: { duration: 0.2 }
      }}
    >
      <div className="flex items-start gap-6">
        {/* Precision Drag Handle */}
        <div 
          onPointerDown={(e) => dragControls.start(e)}
          className="mt-1.5 p-2.5 rounded-xl bg-white/0 hover:bg-white/5 text-white/5 group-hover:text-white/30 transition-all cursor-grab active:cursor-grabbing flex-shrink-0 touch-none shadow-inner"
        >
          <GripVertical size={20} strokeWidth={2.5} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-primary/10 border border-primary/20 text-[10px] font-black text-primary uppercase tracking-widest">
                <Users size={12} strokeWidth={2.5} />
                Hare
              </div>
              {scene.id === "sc-1-1" && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#69daff]/10 border border-[#69daff]/20 text-[10px] font-black text-[#69daff] uppercase tracking-widest">
                  <Users size={12} strokeWidth={2.5} />
                  Lion
                </div>
              )}
            </div>
            
            <div className="text-[10px] font-black text-white/10 uppercase tracking-[0.3em] group-hover:text-white/20 transition-all duration-500">
              SEQUENCE — {index + 1}
            </div>
          </div>

          <h3 className={`text-xl font-bold mb-3 transition-all duration-500 tracking-tight ${isActive ? "text-white" : "text-white/60"}`}>
            {scene.title}
          </h3>

          <p className="text-[13px] leading-relaxed text-white/25 group-hover:text-white/40 transition-all duration-500 line-clamp-2 max-w-2xl font-medium">
            {scene.metadata?.summary || "Narrative analysis pending... Nolan is synthesizing this beat to align with your overall story structure."}
          </p>

          <div className="flex items-center gap-5 mt-6 pt-5 border-t border-white/5">
            <div className="flex items-center gap-2 text-white/10 group-hover:text-white/20 transition-all">
              <MessageSquare size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest leading-none">Context tags: 8</span>
            </div>
          </div>
        </div>
      </div>
    </Reorder.Item>
  );
}
