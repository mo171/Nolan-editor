"use client";

import React, { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, FileText, Sparkles, Plus } from "lucide-react";
import { useProject } from "@/features/project/context/project-context";

// ─── Tag chip input ───────────────────────────────────────────────────────────
function TagChipInput({ tags, onAdd, onRemove, placeholder }) {
  const [input, setInput] = useState("");

  function handleKey(e) {
    if ((e.key === "Enter" || e.key === ",") && input.trim()) {
      e.preventDefault();
      const tag = input.trim().replace(/,$/, "").toLowerCase();
      if (tag && !tags.includes(tag)) onAdd(tag);
      setInput("");
    } else if (e.key === "Backspace" && !input && tags.length) {
      onRemove(tags[tags.length - 1]);
    }
  }

  return (
    <div className="flex flex-wrap gap-1.5 px-3 py-2.5 bg-[#131316] border border-white/6 rounded-xl min-h-[46px] focus-within:border-primary/40 focus-within:shadow-[0_0_0_3px_rgba(186,158,255,0.07)] transition-all duration-200">
      {tags.map((tag) => (
        <span
          key={tag}
          className="flex items-center gap-1 px-2.5 py-0.5 bg-primary/15 border border-primary/20 rounded-full text-[11px] font-semibold text-primary"
        >
          {tag}
          <button onClick={() => onRemove(tag)} className="opacity-60 hover:opacity-100 transition-opacity">
            <X size={10} />
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKey}
        placeholder={tags.length === 0 ? placeholder : ""}
        className="flex-1 min-w-[120px] bg-transparent text-sm text-white/80 placeholder-white/18 outline-none"
      />
    </div>
  );
}

// ─── DNA Upload Zone ──────────────────────────────────────────────────────────
function DnaUploadZone() {
  const { formData, updateField } = useProject();
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = useCallback((file) => {
    if (!file) return;
    const allowed = ["text/plain", "application/pdf"];
    if (!allowed.includes(file.type) && !file.name.match(/\.(txt|pdf)$/i)) return;
    updateField("dnaFile", file);
  }, [updateField]);

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  }

  const file = formData.dnaFile;

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <label className="text-[10px] font-bold tracking-widest text-white/35 uppercase">
          DNA Reference Document
        </label>
        <span className="px-1.5 py-0.5 bg-[#69daff]/10 border border-[#69daff]/20 rounded text-[9px] font-bold text-[#69daff] uppercase tracking-wider">
          Optional
        </span>
      </div>
      <p className="text-[11px] text-white/25 mb-3">
        Upload a reference story (.txt or .pdf) — the AI will learn your preferred style, pacing, and vocabulary.
      </p>

      <AnimatePresence mode="wait">
        {file ? (
          <motion.div
            key="file-attached"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className="flex items-center gap-3 px-4 py-3 bg-[#69daff]/8 border border-[#69daff]/20 rounded-xl"
          >
            <div className="w-8 h-8 rounded-lg bg-[#69daff]/15 flex items-center justify-center flex-shrink-0">
              <FileText size={14} className="text-[#69daff]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-white/90 truncate">{file.name}</div>
              <div className="text-[11px] text-white/35">
                {(file.size / 1024).toFixed(1)} KB · Queued for DNA extraction
              </div>
            </div>
            <button
              onClick={() => updateField("dnaFile", null)}
              className="p-1.5 text-white/30 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
            >
              <X size={14} />
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="drop-zone"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={`cursor-pointer flex flex-col items-center justify-center gap-2 py-8 rounded-xl border-2 border-dashed transition-all duration-200 ${
              dragging
                ? "border-[#69daff]/60 bg-[#69daff]/8"
                : "border-white/8 hover:border-primary/30 hover:bg-white/2"
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
              <Upload size={18} className="text-white/30" />
            </div>
            <div className="text-center">
              <p className="text-sm text-white/50 font-medium">Drop file here or <span className="text-primary/80">browse</span></p>
              <p className="text-[11px] text-white/20 mt-0.5">.txt or .pdf · Max 5MB</p>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".txt,.pdf"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── LLM Temperature Slider ───────────────────────────────────────────────────
function TemperatureSlider() {
  const { formData, updateField } = useProject();
  const val = formData.llmTemperature;

  const label =
    val < 0.3 ? "Conservative & Precise"
    : val < 0.55 ? "Balanced"
    : val < 0.8 ? "Creative"
    : "Wild & Experimental";

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-[10px] font-bold tracking-widest text-white/35 uppercase">
          AI Creativity
        </label>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-primary font-semibold">{label}</span>
          <span className="text-[11px] text-white/25 font-mono">{val.toFixed(1)}</span>
        </div>
      </div>
      <div className="relative">
        <input
          id="field-llm-temperature"
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={val}
          onChange={(e) => updateField("llmTemperature", parseFloat(e.target.value))}
          className="w-full h-1.5 appearance-none rounded-full outline-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #ba9eff ${val * 100}%, rgba(255,255,255,0.08) ${val * 100}%)`,
          }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-white/20">Precise</span>
        <span className="text-[10px] text-white/20">Wild</span>
      </div>
    </div>
  );
}

// ─── Step 2: World Setup ──────────────────────────────────────────────────────
export function StepWorldSetup() {
  const { formData, updateField } = useProject();

  function addTheme(t)    { updateField("themes", [...formData.themes, t]); }
  function removeTheme(t) { updateField("themes", formData.themes.filter((x) => x !== t)); }

  return (
    <div className="space-y-5">
      {/* Story Foundation */}
      <div className="bg-[#0f0f13] border border-white/5 rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
            <Sparkles size={13} className="text-primary" />
          </div>
          <h2 className="text-base font-bold text-white font-heading">Story Foundation</h2>
        </div>

        {/* Premise */}
        <div>
          <label className="block text-[10px] font-bold tracking-widest text-white/35 uppercase mb-1.5">
            Premise
          </label>
          <textarea
            id="field-premise"
            value={formData.premise}
            onChange={(e) => updateField("premise", e.target.value)}
            placeholder="What is your story fundamentally about? One or two sentences."
            rows={3}
            className="w-full px-4 py-3 bg-[#131316] border border-white/6 rounded-xl text-sm text-white/80 placeholder-white/18 outline-none focus:border-primary/40 focus:shadow-[0_0_0_3px_rgba(186,158,255,0.07)] transition-all duration-200 resize-none scrollbar-thin"
          />
        </div>

        {/* Desired Ending */}
        <div>
          <label className="block text-[10px] font-bold tracking-widest text-white/35 uppercase mb-1.5">
            Desired Ending
          </label>
          <textarea
            id="field-ending"
            value={formData.desiredEnding}
            onChange={(e) => updateField("desiredEnding", e.target.value)}
            placeholder="How should this story resolve? The AI will preserve this as a narrative north star."
            rows={3}
            className="w-full px-4 py-3 bg-[#131316] border border-white/6 rounded-xl text-sm text-white/80 placeholder-white/18 outline-none focus:border-primary/40 focus:shadow-[0_0_0_3px_rgba(186,158,255,0.07)] transition-all duration-200 resize-none scrollbar-thin"
          />
        </div>

        {/* Themes */}
        <div>
          <label className="block text-[10px] font-bold tracking-widest text-white/35 uppercase mb-1.5">
            Themes <span className="text-white/20 normal-case tracking-normal font-normal">— press Enter or comma to add</span>
          </label>
          <TagChipInput
            tags={formData.themes}
            onAdd={addTheme}
            onRemove={removeTheme}
            placeholder="e.g. redemption, power, survival..."
          />
        </div>
      </div>

      {/* DNA Upload */}
      <div className="bg-[#0f0f13] border border-white/5 rounded-2xl p-6">
        <DnaUploadZone />
      </div>

      {/* AI Creativity */}
      <div className="bg-[#0f0f13] border border-white/5 rounded-2xl p-6">
        <TemperatureSlider />
      </div>
    </div>
  );
}
