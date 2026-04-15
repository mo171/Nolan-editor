"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Loader2, Image as ImageIcon, ChevronRight } from "lucide-react";
import { useAvatarGeneration } from "@/hooks/useAvatarGeneration";

export function AvatarWizardModal({ open, onClose, projectId, pendingChars, onSuccess }) {
  const {
    pendingChars: activePendingChars,
    currentChar,
    currentCharIndex,
    setCharIndex,
    formState,
    setFormState,
    isGenerating,
    error,
    generateAvatar
  } = useAvatarGeneration(projectId, pendingChars, onSuccess);

  // Reset to first character when modal opens or pending list changes
  useEffect(() => {
    if (open && activePendingChars.length > 0 && !currentChar) {
      setCharIndex(0);
    }
  }, [open, activePendingChars, currentChar, setCharIndex]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className="relative flex flex-col w-full max-w-4xl max-h-[85vh] bg-[#0c0c0f] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#131316]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#ba9eff]/10 flex items-center justify-center text-[#ba9eff]">
              <Sparkles size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">Avatar Generator</h2>
              <p className="text-[10px] text-white/50 tracking-widest uppercase">
                {activePendingChars.length} Pending Characters
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-xl transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        {activePendingChars.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 flex-1 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-4">
              <ImageIcon size={32} />
            </div>
            <h3 className="text-white font-bold text-lg mb-2">All Caught Up!</h3>
            <p className="text-white/50 text-sm max-w-md">
              Every discovered character in your story graph currently has an avatar. 
              Write more scenes to discover new characters!
            </p>
            <button 
              onClick={onClose}
              className="mt-6 px-6 py-2 bg-white/5 hover:bg-white/10 text-white text-sm font-semibold rounded-lg transition-all"
            >
              Continue Writing
            </button>
          </div>
        ) : (
          <div className="flex flex-1 overflow-hidden min-h-[400px]">
            {/* Left Sidebar (Pending List) */}
            <div className="w-64 border-r border-white/5 bg-[#0e0e11] flex flex-col overflow-y-auto">
              <div className="p-4 border-b border-white/5">
                <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                  Needs Portrait
                </h3>
              </div>
              <div className="p-2 space-y-1">
                {activePendingChars.map((c, idx) => {
                  const isActive = currentCharIndex === idx;
                  return (
                    <button
                      key={c.name}
                      onClick={() => !isGenerating && setCharIndex(idx)}
                      disabled={isGenerating}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${
                        isActive
                          ? "bg-[#ba9eff]/10 inset-ring inset-ring-[#ba9eff]/20"
                          : "hover:bg-white/5"
                      } ${isGenerating ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#ba9eff] animate-pulse' : 'bg-amber-400'}`} />
                      <div className="flex-1 truncate">
                        <span className={`text-xs font-semibold block truncate ${isActive ? 'text-[#ba9eff]' : 'text-white/80'}`}>
                          {c.name}
                        </span>
                        <span className="text-[10px] text-white/40 block truncate">
                          {c.role || (c.total_mentions ? `${c.total_mentions} mentions` : 'Character')}
                        </span>
                      </div>
                      {isActive && <ChevronRight size={14} className="text-[#ba9eff]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Editor Panel */}
            <div className="flex-1 bg-[#131316] relative overflow-y-auto">
              {!currentChar ? (
                <div className="absolute inset-0 flex items-center justify-center text-white/30 text-sm">
                  Select a character on the left
                </div>
              ) : (
                <div className="max-w-2xl mx-auto p-8 flex flex-col gap-6">
                  {/* Title & Role */}
                  <div className="pb-4 border-b border-white/5">
                    <h1 className="text-2xl font-bold font-heading text-white mb-1">{currentChar.name}</h1>
                    <div className="text-sm text-white/50">{currentChar.role || "Character"}</div>
                  </div>

                  {error && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center">
                      {error}
                    </div>
                  )}

                  {/* Form */}
                  <div className="space-y-5 flex-1">
                    {/* Visual Description */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white/70 uppercase tracking-wider">Physical Appearance</label>
                      <textarea 
                        value={formState.visual_description}
                        onChange={(e) => setFormState({...formState, visual_description: e.target.value})}
                        disabled={isGenerating}
                        placeholder="e.g. sharp jawline, striking green eyes, unkempt dark hair, scar on left cheek..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-[#ba9eff]/50 focus:bg-white/10 transition-all resize-none h-24"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Age */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-white/70 uppercase tracking-wider">Age / Era</label>
                        <input 
                          type="text"
                          value={formState.age}
                          onChange={(e) => setFormState({...formState, age: e.target.value})}
                          disabled={isGenerating}
                          placeholder="e.g. late 30s, elderly..."
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-[#ba9eff]/50 focus:bg-white/10 transition-all"
                        />
                      </div>
                      
                      {/* Clothing */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-white/70 uppercase tracking-wider">Clothing / Attire</label>
                        <input 
                          type="text"
                          value={formState.clothing}
                          onChange={(e) => setFormState({...formState, clothing: e.target.value})}
                          disabled={isGenerating}
                          placeholder="e.g. tailored wool suit, tattered robes..."
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-[#ba9eff]/50 focus:bg-white/10 transition-all"
                        />
                      </div>
                    </div>

                    {/* Art Style */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white/70 uppercase tracking-wider">Art Style Guide</label>
                      <select
                        value={formState.art_style}
                        onChange={(e) => setFormState({...formState, art_style: e.target.value})}
                        disabled={isGenerating}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#ba9eff]/50 transition-all appearance-none cursor-pointer"
                      >
                        <option value="Cinematic 2026-era Narrative Concept Art, Moody Dramatic Lighting, 8K, Highly Detailed">Cinematic Concept Art (Default)</option>
                        <option value="Graphic Novel Noir, High Contrast Ink, Sharp Lines, Stylized Shadows">Graphic Novel Noir</option>
                        <option value="Painterly Oil Portrait, Impasto Strokes, Classical Lighting, Masterpiece">Classical Painterly</option>
                        <option value="High-Fidelity Anime Style, Studio Ghibli inspired, Rich Colors, Expressive">Elevated Anime</option>
                        <option value="Gritty Cyberpunk 3D Render, Neon Accents, Photorealistic Textures">Gritty Cyberpunk</option>
                      </select>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-6 border-t border-white/5 flex justify-end">
                    <button
                      onClick={generateAvatar}
                      disabled={isGenerating}
                      className="relative overflow-hidden group px-8 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-primary to-[#69daff] text-black shadow-[0_0_20px_rgba(186,158,255,0.3)] hover:shadow-[0_0_30px_rgba(186,158,255,0.5)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                      <div className="relative flex items-center gap-2">
                        {isGenerating ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            Manifesting...
                          </>
                        ) : (
                          <>
                            <Sparkles size={16} />
                            Generate Portrait
                          </>
                        )}
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
