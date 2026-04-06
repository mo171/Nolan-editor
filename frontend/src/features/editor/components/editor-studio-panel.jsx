"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  BarChart3,
  Clock,
  MessageSquare,
  Globe,
  BookOpen,
  Plus,
  ChevronLeft,
  Mic,
  Network,
  Radio,
} from "lucide-react";
import { useEditorContext } from "@/features/editor/context/editor-context";

const STUDIO_GRID = [
  {
    id: "collab",
    icon: Users,
    label: "Collab Hub",
    description: "Co-write in real-time",
    color: "from-primary/20 to-primary/5",
    iconColor: "text-primary",
    glow: "rgba(186,158,255,0.15)",
  },
  {
    id: "community",
    icon: Globe,
    label: "Community",
    description: "Share & discover stories",
    color: "from-[#69daff]/20 to-[#69daff]/5",
    iconColor: "text-[#69daff]",
    glow: "rgba(105,218,255,0.15)",
  },
  {
    id: "analytics",
    icon: BarChart3,
    label: "Analytics",
    description: "Writing insights & stats",
    color: "from-amber-400/20 to-amber-400/5",
    iconColor: "text-amber-400",
    glow: "rgba(251,191,36,0.15)",
  },
  {
    id: "timeline",
    icon: Clock,
    label: "Timeline",
    description: "Story structure map",
    color: "from-emerald-400/20 to-emerald-400/5",
    iconColor: "text-emerald-400",
    glow: "rgba(52,211,153,0.15)",
  },
  {
    id: "ai-chat",
    icon: MessageSquare,
    label: "AI Chat",
    description: "Chat with your story AI",
    color: "from-pink-400/20 to-pink-400/5",
    iconColor: "text-pink-400",
    glow: "rgba(244,114,182,0.15)",
  },
  {
    id: "knowledge",
    icon: Network,
    label: "Knowledge Graph",
    description: "Lore & entity map",
    color: "from-orange-400/20 to-orange-400/5",
    iconColor: "text-orange-400",
    glow: "rgba(251,146,60,0.15)",
  },
];

const AUDIO_LANGS = ["हिन्दी", "বাংলা", "ਕਾਤਲਾ", "ಕನ್ನಡ", "मराठी", "বাংলা..."];

function StudioCard({ item }) {
  const [hovered, setHovered] = useState(false);
  const Icon = item.icon;

  return (
    <motion.button
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.97 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className={`relative group flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-gradient-to-b ${item.color} border border-white/5 hover:border-white/10 transition-all duration-200 overflow-hidden`}
      style={{
        boxShadow: hovered ? `0 0 20px ${item.glow}` : "none",
      }}
    >
      <div className={`p-2 rounded-lg bg-[#0e0e11]/50 ${item.iconColor}`}>
        <Icon size={16} />
      </div>
      <span className="text-xs font-semibold text-white/70 group-hover:text-white/90 transition-colors text-center leading-tight">
        {item.label}
      </span>
    </motion.button>
  );
}

export function EditorStudioPanel() {
  const { studioPanelOpen, setStudioPanelOpen, activeMode } = useEditorContext();

  return (
    <AnimatePresence initial={false}>
      {studioPanelOpen && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 280, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="flex-shrink-0 h-full overflow-hidden bg-[#0c0c0f] border-l border-white/5 flex flex-col"
          style={{ width: 280 }}
        >
          {/* Panel Header */}
          <div className="flex items-center justify-between px-3 pt-4 pb-2 flex-shrink-0">
            <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.15em]">
              Nolan Studio
            </span>
            <button
              onClick={() => setStudioPanelOpen(false)}
              className="p-1 rounded-md hover:bg-white/5 text-white/20 hover:text-white/50 transition-all"
            >
              <ChevronLeft size={14} />
            </button>
          </div>

          {/* Q&A / Quick Inference bar */}
          <div className="px-3 mb-4">
            <div className="relative group">
              <div className="absolute inset-0 bg-primary/5 rounded-xl blur-md group-focus-within:bg-primary/10 transition-all opacity-0 group-focus-within:opacity-100" />
              <div className="relative flex items-center bg-[#131316] border border-white/5 group-focus-within:border-primary/30 rounded-xl px-3 py-2 transition-all shadow-xl">
                <Radio size={14} className="text-primary mr-2 animate-pulse" />
                <input 
                  type="text"
                  placeholder="Ask Nolan anything..."
                  className="bg-transparent text-xs text-white/80 outline-none w-full placeholder:text-white/20"
                />
              </div>
            </div>
          </div>

          {/* Audio Overview Banner */}
          <div className="mx-3 mb-3 p-3 rounded-xl bg-gradient-to-br from-primary/10 to-[#69daff]/5 border border-primary/10">
            <div className="flex items-center gap-2 mb-2">
              <Mic size={13} className="text-primary" />
              <span className="text-[10px] font-semibold text-white/60 leading-tight">
                Create an Audio Overview in:
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {AUDIO_LANGS.map((lang) => (
                <button
                  key={lang}
                  className="px-1.5 py-0.5 rounded text-[10px] bg-white/5 text-white/40 hover:bg-primary/20 hover:text-primary/80 transition-colors border border-white/5"
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>

          {/* Studio Content */}
          <div className="flex-1 overflow-y-auto px-3 pb-3 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {activeMode === "Thinking" ? (
              <div className="flex flex-col h-full">
                <div className="flex-1 space-y-4">
                  {/* Chat Messages */}
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-[11px] leading-relaxed text-white/70">
                    <div className="text-[9px] font-bold text-primary uppercase mb-1">Nolan Intelligence</div>
                    "The pacing in this paragraph feels slightly rushed. Consider adding more sensory details to the 'Lion's den' to increase tension before the Hare's dialogue."
                  </div>
                  <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-[11px] leading-relaxed text-white/80 italic">
                    <div className="text-[9px] font-bold text-white/30 uppercase mb-1">Context: Current Selection</div>
                    "Animals started to visit his den one by one every day..."
                  </div>
                </div>

                {/* Input Area */}
                <div className="mt-4 pt-3 border-t border-white/5">
                  <div className="flex items-center gap-2 bg-[#131316] border border-white/10 rounded-xl px-2 py-1.5 focus-within:border-primary/40 transition-all">
                    <input 
                      type="text" 
                      placeholder="Ask about this scene..." 
                      className="flex-1 bg-transparent text-[11px] text-white/80 outline-none px-1"
                    />
                    <button className="p-1 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 shadow-lg shadow-primary/5">
                      <Plus size={12} className="rotate-45" /> 
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {STUDIO_GRID.map((item) => (
                    <StudioCard key={item.id} item={item} />
                  ))}
                </div>

                {/* Extra quick actions */}
                <div className="mt-3 space-y-1.5">
                  <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/3 hover:bg-white/5 border border-white/5 hover:border-white/10 transition-all group">
                    <div className="w-7 h-7 rounded-lg bg-[#69daff]/15 flex items-center justify-center">
                      <Radio size={13} className="text-[#69daff]" />
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <div className="text-[10px] font-semibold text-white/60 group-hover:text-white/80 transition-colors">
                        Broadcast
                      </div>
                      <div className="text-[9px] text-white/25">Share live session</div>
                    </div>
                  </button>
                  <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/3 hover:bg-white/5 border border-white/5 hover:border-white/10 transition-all group">
                    <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
                      <BookOpen size={13} className="text-primary" />
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <div className="text-[10px] font-semibold text-white/60 group-hover:text-white/80 transition-colors">
                        Story Bible
                      </div>
                      <div className="text-[9px] text-white/25">World reference sheet</div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Add Note FAB */}
          <div className="px-3 pb-4 flex-shrink-0">
            <motion.button
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.97 }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-primary/20 to-[#69daff]/15 border border-primary/20 hover:border-primary/40 text-primary font-semibold text-xs transition-all shadow-[0_0_15px_rgba(186,158,255,0.1)] hover:shadow-[0_0_25px_rgba(186,158,255,0.2)]"
            >
              <Plus size={14} />
              Add note
            </motion.button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
