"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Users, X, ChevronDown } from "lucide-react";
import { useProject } from "@/features/project/context/project-context";

const ROLES = ["Protagonist", "Antagonist", "Supporting", "Mentor", "Foil", "Love Interest"];

const ROLE_STYLES = {
  Protagonist:    "bg-primary/15 text-primary border-primary/20",
  Antagonist:     "bg-red-400/15 text-red-300 border-red-400/20",
  Supporting:     "bg-white/8 text-white/60 border-white/10",
  Mentor:         "bg-amber-400/15 text-amber-300 border-amber-400/20",
  Foil:           "bg-[#69daff]/15 text-[#69daff] border-[#69daff]/20",
  "Love Interest":"bg-pink-400/15 text-pink-300 border-pink-400/20",
};

// ─── Trait chip input ─────────────────────────────────────────────────────────
function TraitInput({ traits, onAdd, onRemove }) {
  const [input, setInput] = useState("");

  function handleKey(e) {
    if ((e.key === "Enter" || e.key === ",") && input.trim()) {
      e.preventDefault();
      const t = input.trim().replace(/,$/, "").toLowerCase();
      if (t && !traits.includes(t)) onAdd(t);
      setInput("");
    } else if (e.key === "Backspace" && !input && traits.length) {
      onRemove(traits[traits.length - 1]);
    }
  }

  return (
    <div className="flex flex-wrap gap-1 px-3 py-2 bg-[#131316] border border-white/6 rounded-xl min-h-[40px] focus-within:border-primary/40 transition-all">
      {traits.map((t) => (
        <span key={t} className="flex items-center gap-1 px-2 py-0.5 bg-white/8 rounded-full text-[10px] text-white/60">
          {t}
          <button onClick={() => onRemove(t)} className="opacity-50 hover:opacity-100">
            <X size={9} />
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKey}
        placeholder={traits.length === 0 ? "brave, cunning... (Enter)" : ""}
        className="flex-1 min-w-[100px] bg-transparent text-xs text-white/70 placeholder-white/20 outline-none"
      />
    </div>
  );
}

// ─── Role dropdown ────────────────────────────────────────────────────────────
function RoleDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-200 ${
          ROLE_STYLES[value] ?? "bg-white/5 text-white/50 border-white/10"
        }`}
      >
        {value}
        <ChevronDown size={11} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.13 }}
            className="absolute top-full mt-1 left-0 z-50 bg-[#131316]/98 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl min-w-[160px]"
          >
            {ROLES.map((r) => (
              <button
                key={r}
                onClick={() => { onChange(r); setOpen(false); }}
                className={`w-full text-left px-3 py-2 text-xs font-semibold transition-colors ${
                  r === value ? "bg-white/8" : "hover:bg-white/5"
                }`}
              >
                <span className={`inline-block px-2 py-0.5 rounded-full border text-[10px] ${ROLE_STYLES[r] ?? "text-white/60 border-white/10"}`}>
                  {r}
                </span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Character Card ───────────────────────────────────────────────────────────
function CharacterCard({ character, index }) {
  const { updateCharacter, removeCharacter } = useProject();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ duration: 0.25, delay: index * 0.05 }}
      className="bg-[#131316] border border-white/6 rounded-2xl p-5 space-y-4 group"
    >
      {/* Header row */}
      <div className="flex items-center gap-3">
        {/* Avatar initial */}
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/30 to-[#69daff]/30 flex items-center justify-center text-white/80 text-sm font-bold flex-shrink-0">
          {character.name?.[0]?.toUpperCase() || "?"}
        </div>

        {/* Name input */}
        <input
          type="text"
          value={character.name}
          onChange={(e) => updateCharacter(character.id, "name", e.target.value)}
          placeholder="Character name..."
          className="flex-1 bg-transparent text-sm font-semibold text-white/90 placeholder-white/20 outline-none border-b border-transparent focus:border-white/10 transition-colors pb-0.5"
        />

        <RoleDropdown
          value={character.role}
          onChange={(v) => updateCharacter(character.id, "role", v)}
        />

        <button
          onClick={() => removeCharacter(character.id)}
          className="opacity-0 group-hover:opacity-100 p-1.5 text-white/25 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Description */}
      <textarea
        value={character.description}
        onChange={(e) => updateCharacter(character.id, "description", e.target.value)}
        placeholder="Brief description of this character's backstory, motivation, and arc..."
        rows={2}
        className="w-full px-0 py-1 bg-transparent text-xs text-white/60 placeholder-white/18 outline-none border-b border-white/5 focus:border-white/15 transition-all resize-none scrollbar-thin"
      />

      {/* Traits */}
      <div>
        <span className="block text-[9px] font-bold tracking-widest text-white/20 uppercase mb-1.5">Traits</span>
        <TraitInput
          traits={character.traits}
          onAdd={(t) => updateCharacter(character.id, "traits", [...character.traits, t])}
          onRemove={(t) => updateCharacter(character.id, "traits", character.traits.filter((x) => x !== t))}
        />
      </div>
    </motion.div>
  );
}

// ─── Step 3: The Cast ─────────────────────────────────────────────────────────
export function StepTheCast() {
  const { formData, addCharacter } = useProject();

  return (
    <div className="space-y-5">
      {/* Header card */}
      <div className="bg-[#0f0f13] border border-white/5 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
              <Users size={13} className="text-primary" />
            </div>
            <h2 className="text-base font-bold text-white font-heading">The Cast</h2>
          </div>
          <span className="text-[11px] text-white/30">
            {formData.characters.length} character{formData.characters.length !== 1 ? "s" : ""} defined
          </span>
        </div>

        {formData.characters.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
              <Users size={20} className="text-white/20" />
            </div>
            <p className="text-sm text-white/30 font-medium">No characters yet</p>
            <p className="text-xs text-white/18 mt-1">
              Add key characters — the AI will track their arcs as you write
            </p>
          </div>
        )}

        <AnimatePresence>
          <div className="space-y-4">
            {formData.characters.map((char, i) => (
              <CharacterCard key={char.id} character={char} index={i} />
            ))}
          </div>
        </AnimatePresence>

        {/* Add character button */}
        <button
          id="add-character-btn"
          onClick={addCharacter}
          className="mt-4 w-full flex items-center justify-center gap-2 py-3 border border-dashed border-white/10 rounded-2xl text-sm font-semibold text-white/30 hover:text-primary/70 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200"
        >
          <Plus size={15} />
          Add Character
        </button>
      </div>
    </div>
  );
}
