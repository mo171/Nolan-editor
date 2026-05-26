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
  X,
  Check,
  AlertCircle,
  Lightbulb,
  ShieldAlert,
  Film,
  PlayCircle,
  Loader2,
  Zap,
  Clapperboard
} from "lucide-react";
import { useEditorContext } from "@/features/editor/context/editor-context";
import { NeuralPulseChart } from "./neural-pulse-chart";
import { PacingHeatmap } from "./pacing-heatmap";

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
  {
    id: "animate",
    icon: Film,
    label: "Animate Story",
    description: "Narrated slideshow",
    color: "from-indigo-400/20 to-indigo-400/5",
    iconColor: "text-indigo-400",
    glow: "rgba(129,140,248,0.15)",
  },
  {
    id: "kling-video",
    icon: Clapperboard,
    label: "Generate Video",
    description: "Kling AI Cinematic",
    color: "from-[#ba9eff]/20 to-[#ba9eff]/5",
    iconColor: "text-[#ba9eff]",
    glow: "rgba(186,158,255,0.15)",
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
  const { 
    studioPanelOpen, 
    setStudioPanelOpen, 
    activeMode, 
    activeSuggestion, 
    setActiveSuggestion,
    generateAnimatic,
    isAnimaticGenerating,
    chapters,
    activeScene,
    neuralStats,
    isNeuralSyncing,
    syncNeuralStats,
    setActiveView,
    generateVideo
  } = useEditorContext();

  const [activeTab, setActiveTab] = useState("grid"); // 'grid' | 'analytics' is partially handled by activeView now
  const [activeKpi, setActiveKpi] = useState("arousal");

  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [characterVoices, setCharacterVoices] = useState({});
  const [availableVoices, setAvailableVoices] = useState({});

  // Fetch voices when opening modal
  const openVoiceModal = async () => {
    setIsVoiceModalOpen(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/animate/voices`);
      const voices = await res.json();
      setAvailableVoices(voices);
    } catch (e) {
      console.error("Failed to fetch voices", e);
    }
  };

  const handleStartAnimation = () => {
    // We pass null or empty characterVoices to trigger the backend's Auto-Caster
    generateAnimatic({});
    setIsVoiceModalOpen(false);
  };

  // Helper to map linter types to colors/icons
  const getLinterConfig = (type) => {
    switch (type) {
      case "spelling":
        return { icon: ShieldAlert, color: "text-[#ff4d4f]", bg: "bg-[#ff4d4f]/10", border: "border-[#ff4d4f]/30", glow: "shadow-[#ff4d4f]/20", title: "Grammar & Spelling" };
      case "inconsistency":
        return { icon: AlertCircle, color: "text-[#ba9eff]", bg: "bg-[#ba9eff]/10", border: "border-[#ba9eff]/30", glow: "shadow-[#ba9eff]/20", title: "Narrative Drift" };
      case "creative":
        return { icon: Lightbulb, color: "text-[#69daff]", bg: "bg-[#69daff]/10", border: "border-[#69daff]/30", glow: "shadow-[#69daff]/20", title: "Creative Insight" };
      default:
        return { icon: AlertCircle, color: "text-white/60", bg: "bg-white/10", border: "border-white/20", glow: "shadow-white/10", title: "Suggestion" };
    }
  };

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
            {activeTab === "analytics" ? (
              <div className="flex flex-col h-full animate-in slide-in-from-right-4 fade-in duration-300">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                   <button 
                    onClick={() => setActiveTab("grid")}
                    className="p-1 rounded-md text-white/30 hover:bg-white/5 hover:text-white transition-all"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <div className="text-[10px] font-bold text-white/50 uppercase tracking-widest flex items-center gap-2">
                    <BarChart3 size={12} className="text-amber-400" />
                    Neural Engine
                  </div>
                  <div className="w-6" /> 
                </div>

                {/* KPI Selectors */}
                <div className="grid grid-cols-3 gap-1 mb-4">
                  {["arousal", "visual", "semantic"].map((kpi) => (
                    <button
                      key={kpi}
                      onClick={() => setActiveKpi(kpi)}
                      className={`py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all border ${
                        activeKpi === kpi 
                          ? "bg-white/10 border-white/20 text-white" 
                          : "bg-transparent border-transparent text-white/30 hover:text-white/50"
                      }`}
                    >
                      {kpi}
                    </button>
                  ))}
                </div>

                {/* Main Graph */}
                <div className="mb-4 bg-[#131316] border border-white/5 rounded-2xl p-2 relative overflow-hidden group">
                  <div className="absolute top-2 right-3 text-[8px] font-black text-white/10 uppercase tracking-tighter italic">Live Pulse</div>
                  <NeuralPulseChart data={neuralStats?.[`${activeKpi}_data`]} activeKpi={activeKpi} />
                </div>

                {/* Heatmap */}
                <div className="mb-6">
                  <PacingHeatmap 
                    arousal={neuralStats?.arousal_data} 
                    visual={neuralStats?.visual_data} 
                  />
                </div>

                {/* Hook Score */}
                {neuralStats?.hook_score && (
                  <div className="mb-6 p-4 rounded-xl bg-gradient-to-br from-amber-400/10 to-transparent border border-amber-400/20">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest flex items-center gap-2">
                        <Zap size={10} />
                        Hook Score
                      </span>
                      <span className="text-lg font-black text-white tracking-tighter">
                        {Math.round(neuralStats.hook_score * 100)}%
                      </span>
                    </div>
                    <div className="text-[10px] text-white/40 leading-relaxed">
                      {neuralStats.hook_score > 0.6 
                        ? "Opening triggers significant reward novelty. High engagement."
                        : "Weak reward signature. Consider a stronger pattern interrupt."}
                    </div>
                  </div>
                )}

                {/* Manual Sync Button */}
                <button
                  onClick={syncNeuralStats}
                  disabled={isNeuralSyncing}
                  className={`mt-auto w-full py-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all shadow-xl ${
                    isNeuralSyncing 
                      ? "bg-white/5 text-white/20 cursor-not-allowed" 
                      : "bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 text-amber-400 shadow-amber-400/5 hover:shadow-amber-400/20"
                  }`}
                >
                  {isNeuralSyncing ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Neuralizing...
                    </>
                  ) : (
                    <>
                      <Radio size={14} className="animate-pulse" />
                      Sync Neural Stats
                    </>
                  )}
                </button>
                <div className="mt-2 text-[8px] text-white/20 text-center uppercase tracking-widest leading-relaxed">
                  Predicts average human fMRI response<br/>using Tribe v2 Engine
                </div>
              </div>
            ) : activeSuggestion ? (
              <div className="flex flex-col h-full animate-in slide-in-from-right-4 fade-in duration-300">
                
                {/* Active Suggestion Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[10px] font-bold text-white/50 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Review Fix
                  </div>
                  <button 
                    onClick={() => setActiveSuggestion(null)}
                    className="p-1 rounded-md text-white/30 hover:bg-white/5 hover:text-white transition-all"
                  >
                    <X size={14} />
                  </button>
                </div>
                
                {(() => {
                  const config = getLinterConfig(activeSuggestion.type);
                  const Icon = config.icon;
                  return (
                    <div className={`p-4 rounded-xl ${config.bg} border ${config.border} flex flex-col gap-4 shadow-xl ${config.glow}`}>
                       
                       <div className="flex items-center gap-2">
                         <Icon size={14} className={config.color} />
                         <span className={`text-[11px] font-black uppercase tracking-wider ${config.color}`}>
                           {config.title}
                         </span>
                       </div>

                       <div className="text-[12px] leading-relaxed text-white/80 font-medium">
                         {activeSuggestion.message}
                       </div>

                       {activeSuggestion.suggestion && (
                         <div className="bg-[#0e0e11]/50 border border-white/5 rounded-lg p-3">
                           <div className="text-[9px] font-bold text-white/30 uppercase mb-1">Proposed Fix:</div>
                           <div className="text-[11px] italic text-white/90">
                             "{activeSuggestion.suggestion}"
                           </div>
                         </div>
                       )}

                       <div className="grid grid-cols-2 gap-2 mt-2">
                          <button 
                            onClick={() => {
                               // To actually apply, we trigger a global event or context function that replaces text.
                               // We'll communicate to Tiptap via custom events or using the global window object for simplicity.
                               const event = new CustomEvent('nolan-apply-suggestion', { detail: activeSuggestion });
                               window.dispatchEvent(event);
                               setActiveSuggestion(null);
                            }}
                            className={`flex items-center justify-center gap-2 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold transition-all ${config.border} border`}
                          >
                            <Check size={12} />
                            Apply Fix
                          </button>
                          
                          <button 
                            onClick={() => {
                               const event = new CustomEvent('nolan-reject-suggestion', { detail: activeSuggestion });
                               window.dispatchEvent(event);
                               setActiveSuggestion(null);
                            }}
                            className="flex items-center justify-center gap-2 py-2 rounded-lg bg-[#0e0e11] hover:bg-white/5 border border-white/5 text-white/40 hover:text-white/80 text-[10px] font-bold transition-all"
                          >
                            <X size={12} />
                            Reject
                          </button>
                       </div>
                    </div>
                  );
                })()}

              </div>
            ) : activeMode === "Thinking" ? (
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
                    <motion.button
                      key={item.id}
                      onClick={() => {
                        if (item.id === "animate") openVoiceModal();
                        if (item.id === "kling-video") generateVideo(false);
                        if (item.id === "analytics") setActiveView("analytics");
                      }}
                      whileHover={{ scale: 1.03, y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      className={`relative group flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-gradient-to-b ${item.color} border border-white/5 hover:border-white/10 transition-all duration-200 overflow-hidden`}
                    >
                       <div className={`p-2 rounded-lg bg-[#0e0e11]/50 ${item.iconColor}`}>
                        <item.icon size={16} />
                      </div>
                      <span className="text-xs font-semibold text-white/70 group-hover:text-white/90 transition-colors text-center leading-tight">
                        {item.label}
                      </span>
                    </motion.button>
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

          {/* Voice Selection Modal */}
          <AnimatePresence>
            {isVoiceModalOpen && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
              >
                <motion.div 
                   initial={{ scale: 0.9, y: 20 }}
                   animate={{ scale: 1, y: 0 }}
                   className="bg-[#131316] border border-white/10 w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
                >
                  <div className="p-4 border-b border-white/5 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Mic size={16} className="text-primary" />
                      Cast Your Story
                    </h3>
                    <button onClick={() => setIsVoiceModalOpen(false)} className="text-white/40 hover:text-white">
                      <X size={16} />
                    </button>
                  </div>
                  
                  <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
                    <p className="text-[11px] text-white/50 leading-relaxed">
                      Assign a high-fidelity AI voice to your characters for the animatic.
                    </p>
                    
                    {/* Characters List */}
                    <div className="space-y-3">
                      {/* For now, we take unique characters from the story bible or context */}
                      {["Narrator", "Protagonist", "Antagonist"].map((char) => (
                        <div key={char} className="space-y-1.5">
                          <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{char}</label>
                          <select 
                            className="w-full bg-[#0e0e11] border border-white/5 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-primary/50 transition-all"
                            value={characterVoices[char] || ""}
                            onChange={(e) => setCharacterVoices({...characterVoices, [char]: e.target.value})}
                          >
                            <option value="">Select Voice...</option>
                            {Object.entries(availableVoices).map(([id, meta]) => (
                              <option key={id} value={id}>{meta.name} ({meta.gender})</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 bg-[#0e0e11]/50 border-t border-white/5">
                    <button 
                      onClick={handleStartAnimation}
                      disabled={isAnimaticGenerating}
                      className="w-full py-2.5 rounded-xl bg-primary text-white font-bold text-xs hover:bg-primary/80 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                    >
                      {isAnimaticGenerating ? <Loader2 size={14} className="animate-spin" /> : <PlayCircle size={14} />}
                      {isAnimaticGenerating ? "Director is Casting..." : "Animate in 16:9 Cinematic Mode"}
                    </button>
                    <p className="mt-2 text-[9px] text-white/30 text-center uppercase tracking-widest font-bold">
                      Using AI Auto-Casting & Multi-Shot Director
                    </p>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
