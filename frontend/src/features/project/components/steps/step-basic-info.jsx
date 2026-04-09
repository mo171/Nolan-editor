"use client";

import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Info } from "lucide-react";
import { useProject } from "@/features/project/context/project-context";

const GENRES = ["Cyberpunk", "Sci-Fi", "Fantasy", "Horror", "Thriller", "Drama", "Mystery", "Action", "Romance", "Historical"];
const TONES  = ["Dark & Grim", "Hopeful", "Satirical", "Lyrical", "Tense & Urgent", "Whimsical", "Melancholic", "Epic"];

// ─── Shared field label ───────────────────────────────────────────────────────
function FieldLabel({ children }) {
  return (
    <label className="block text-[10px] font-bold tracking-widest text-white/35 uppercase mb-1.5">
      {children}
    </label>
  );
}

// ─── Shared text input ────────────────────────────────────────────────────────
function TextInput({ id, value, onChange, placeholder }) {
  return (
    <input
      id={id}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-4 py-3 bg-[#131316] border border-white/6 rounded-xl text-sm text-white/80 placeholder-white/18 outline-none focus:border-primary/40 focus:shadow-[0_0_0_3px_rgba(186,158,255,0.07)] transition-all duration-200"
    />
  );
}

// ─── Shared select dropdown ───────────────────────────────────────────────────
function SelectDropdown({ id, value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  React.useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        id={id}
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[#131316] border border-white/6 rounded-xl text-sm text-white/70 hover:border-primary/30 hover:text-white transition-all duration-200"
      >
        <span className={value ? "text-white/80" : "text-white/25"}>
          {value || placeholder}
        </span>
        <ChevronDown
          size={14}
          className={`text-white/25 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-1 left-0 right-0 z-50 bg-[#131316]/98 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-auto max-h-48 scrollbar-thin"
          >
            {options.map((opt) => (
              <button
                key={opt}
                onClick={() => { onChange(opt); setOpen(false); }}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                  opt === value
                    ? "text-primary font-semibold bg-primary/10"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                {opt}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Shared section card ──────────────────────────────────────────────────────
function SectionCard({ icon: Icon, title, children }) {
  return (
    <div className="bg-[#0f0f13] border border-white/5 rounded-2xl p-6 space-y-5">
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
          {Icon ? <Icon size={14} className="text-primary" /> : null}
        </div>
        <h2 className="text-base font-bold text-white font-heading">{title}</h2>
      </div>
      {children}
    </div>
  );
}

// ─── Step 1: Basic Info ───────────────────────────────────────────────────────
export function StepBasicInfo() {
  const { formData, updateField } = useProject();

  return (
    <div className="space-y-5">
      {/* Project Fundamentals */}
      <SectionCard icon={Info} title="Project Fundamentals">
        {/* Title */}
        <div>
          <FieldLabel>Project Title</FieldLabel>
          <TextInput
            id="field-title"
            value={formData.title}
            onChange={(v) => updateField("title", v)}
            placeholder="Enter a working title..."
          />
        </div>

        {/* Genre + Tone */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel>Genre</FieldLabel>
            <SelectDropdown
              id="field-genre"
              value={formData.genre}
              onChange={(v) => updateField("genre", v)}
              options={GENRES}
              placeholder="Select genre"
            />
          </div>
          <div>
            <FieldLabel>Tone</FieldLabel>
            <SelectDropdown
              id="field-tone"
              value={formData.tone}
              onChange={(v) => updateField("tone", v)}
              options={TONES}
              placeholder="Select tone"
            />
          </div>
        </div>

        {/* Target Audience */}
        <div>
          <FieldLabel>Target Audience</FieldLabel>
          <TextInput
            id="field-audience"
            value={formData.targetAudience}
            onChange={(v) => updateField("targetAudience", v)}
            placeholder="e.g. Young Adult, Hard Sci-Fi Fans"
          />
        </div>
      </SectionCard>

      {/* World Anchors */}
      <SectionCard icon={null} title="🌐  World Anchors">
        <div>
          <FieldLabel>Setting Description</FieldLabel>
          <textarea
            id="field-setting"
            value={formData.settingDescription}
            onChange={(e) => updateField("settingDescription", e.target.value)}
            placeholder="Describe the atmosphere, geography, and vibe of your world..."
            rows={4}
            className="w-full px-4 py-3 bg-[#131316] border border-white/6 rounded-xl text-sm text-white/80 placeholder-white/18 outline-none focus:border-primary/40 focus:shadow-[0_0_0_3px_rgba(186,158,255,0.07)] transition-all duration-200 resize-none scrollbar-thin"
          />
        </div>
      </SectionCard>
    </div>
  );
}
