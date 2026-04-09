"use client";

import React, { useState } from "react";
import { X, Swords, CheckCircle2, FileText } from "lucide-react";
import { useProject } from "@/features/project/context/project-context";

const CONFLICT_TYPES = [
  "Man vs. Man",
  "Man vs. Society",
  "Man vs. Nature",
  "Man vs. Self",
  "Man vs. Technology",
  "Man vs. Fate",
  "Man vs. Supernatural",
];

// ─── Tag chip input (reused pattern) ─────────────────────────────────────────
function TagInput({ tags, onAdd, onRemove, placeholder }) {
  const [input, setInput] = useState("");
  function handleKey(e) {
    if ((e.key === "Enter" || e.key === ",") && input.trim()) {
      e.preventDefault();
      const v = input.trim().replace(/,$/, "").toLowerCase();
      if (v && !tags.includes(v)) onAdd(v);
      setInput("");
    } else if (e.key === "Backspace" && !input && tags.length) {
      onRemove(tags[tags.length - 1]);
    }
  }
  return (
    <div className="flex flex-wrap gap-1.5 px-3 py-2.5 bg-[#131316] border border-white/6 rounded-xl min-h-[46px] focus-within:border-primary/40 focus-within:shadow-[0_0_0_3px_rgba(186,158,255,0.07)] transition-all">
      {tags.map((t) => (
        <span key={t} className="flex items-center gap-1 px-2.5 py-0.5 bg-primary/15 border border-primary/20 rounded-full text-[11px] font-semibold text-primary">
          {t}
          <button onClick={() => onRemove(t)} className="opacity-60 hover:opacity-100"><X size={10} /></button>
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

// ─── Summary review row ───────────────────────────────────────────────────────
function ReviewRow({ label, value, fallback = "—" }) {
  const displayVal = Array.isArray(value)
    ? value.length > 0 ? value.join(", ") : fallback
    : value || fallback;

  const isEmpty = displayVal === fallback;

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-white/4 last:border-none">
      <div className="w-28 flex-shrink-0">
        <span className="text-[10px] font-bold tracking-widest text-white/25 uppercase">{label}</span>
      </div>
      <span className={`text-sm flex-1 ${isEmpty ? "text-white/18 italic" : "text-white/70"}`}>
        {displayVal}
      </span>
    </div>
  );
}

// ─── Step 4: Conflict ─────────────────────────────────────────────────────────
export function StepConflict() {
  const { formData, updateField } = useProject();

  function toggleConflict(type) {
    const current = formData.conflictTypes;
    updateField(
      "conflictTypes",
      current.includes(type) ? current.filter((c) => c !== type) : [...current, type]
    );
  }

  function addTension(t)    { updateField("tensionTags", [...formData.tensionTags, t]); }
  function removeTension(t) { updateField("tensionTags", formData.tensionTags.filter((x) => x !== t)); }

  return (
    <div className="space-y-5">
      {/* Conflict Type */}
      <div className="bg-[#0f0f13] border border-white/5 rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
            <Swords size={13} className="text-primary" />
          </div>
          <h2 className="text-base font-bold text-white font-heading">Conflict Architecture</h2>
        </div>

        <div>
          <label className="block text-[10px] font-bold tracking-widest text-white/35 uppercase mb-3">
            Conflict Type <span className="normal-case font-normal tracking-normal text-white/20">— select all that apply</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {CONFLICT_TYPES.map((type) => {
              const active = formData.conflictTypes.includes(type);
              return (
                <button
                  key={type}
                  onClick={() => toggleConflict(type)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all duration-200 ${
                    active
                      ? "bg-primary/20 border-primary/40 text-primary shadow-[0_0_12px_rgba(186,158,255,0.15)]"
                      : "bg-white/4 border-white/8 text-white/45 hover:border-white/20 hover:text-white/70"
                  }`}
                >
                  {type}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tension Tags */}
        <div>
          <label className="block text-[10px] font-bold tracking-widest text-white/35 uppercase mb-1.5">
            Narrative Tension Tags
          </label>
          <TagInput
            tags={formData.tensionTags}
            onAdd={addTension}
            onRemove={removeTension}
            placeholder="betrayal, power struggle, time pressure... (Enter)"
          />
        </div>

        {/* Inciting Incident */}
        <div>
          <label className="block text-[10px] font-bold tracking-widest text-white/35 uppercase mb-1.5">
            Inciting Incident
          </label>
          <textarea
            id="field-inciting-incident"
            value={formData.incitingIncident}
            onChange={(e) => updateField("incitingIncident", e.target.value)}
            placeholder="The single event that sets your story in motion..."
            rows={3}
            className="w-full px-4 py-3 bg-[#131316] border border-white/6 rounded-xl text-sm text-white/80 placeholder-white/18 outline-none focus:border-primary/40 focus:shadow-[0_0_0_3px_rgba(186,158,255,0.07)] transition-all resize-none scrollbar-thin"
          />
        </div>
      </div>

      {/* Final Summary Review */}
      <div className="bg-[#0f0f13] border border-white/5 rounded-2xl p-6 space-y-1">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-7 h-7 rounded-lg bg-emerald-400/15 flex items-center justify-center">
            <FileText size={13} className="text-emerald-400" />
          </div>
          <h2 className="text-base font-bold text-white font-heading">Project Summary</h2>
          <span className="ml-auto text-[11px] text-white/25">Review before launch</span>
        </div>

        <ReviewRow label="Title"        value={formData.title} />
        <ReviewRow label="Genre"        value={formData.genre} />
        <ReviewRow label="Tone"         value={formData.tone} />
        <ReviewRow label="Audience"     value={formData.targetAudience} />
        <ReviewRow label="Premise"      value={formData.premise} />
        <ReviewRow label="Themes"       value={formData.themes} />
        <ReviewRow label="Characters"   value={formData.characters.map((c) => `${c.name} (${c.role})`)} />
        <ReviewRow label="Conflicts"    value={formData.conflictTypes} />
        <ReviewRow label="DNA File"     value={formData.dnaFile?.name} />
        <ReviewRow label="AI Creativity" value={`${formData.llmTemperature.toFixed(1)} / 1.0`} />
      </div>
    </div>
  );
}
