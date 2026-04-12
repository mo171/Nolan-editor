"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Share2,
  Settings,
  Download,
  RefreshCw,
  ChevronDown,
} from "lucide-react";
import { useEditorContext } from "@/features/editor/context/editor-context";
import Link from "next/link";
import { useParams } from "next/navigation";

const GENRES = ["Thriller", "Drama", "Sci-Fi", "Fantasy", "Horror", "Romance", "Action", "Mystery"];
const MODES = ["Creative", "Thinking", "Planning"];

function GenreTag({ genre, onClick }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { updateProjectGenre } = useEditorContext();

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#25252a] border border-white/10 text-white/80 text-xs font-semibold hover:border-primary/40 hover:text-white transition-all duration-200"
      >
        {genre}
        <ChevronDown size={12} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-2 left-0 z-50 bg-[#1a1a1f]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden min-w-[130px]"
          >
            {GENRES.map((g) => (
              <button
                key={g}
                onClick={() => {
                  updateProjectGenre(g);
                  setOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-xs hover:bg-white/5 transition-colors ${
                  g === genre ? "text-primary font-semibold" : "text-white/70"
                }`}
              >
                {g}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function EditorTopbar() {
  const {
    projectTitle,
    projectGenre,
    saveStatus,
    activeMode,
    updateProjectTitle,
    setActiveMode,
  } = useEditorContext();

  const params = useParams();
  const projectId = params?.projectId;

  const [editingTitle, setEditingTitle] = useState(false);
  const titleRef = useRef(null);

  useEffect(() => {
    if (editingTitle && titleRef.current) {
      titleRef.current.focus();
      titleRef.current.select();
    }
  }, [editingTitle]);

  const saveIndicator = {
    saved: { color: "text-emerald-400", label: "Saved", dot: "bg-emerald-400" },
    saving: { color: "text-amber-400", label: "Saving...", dot: "bg-amber-400" },
    unsaved: { color: "text-white/40", label: "Unsaved", dot: "bg-white/30" },
    error: { color: "text-red-400", label: "Save Failed", dot: "bg-red-400" },
  }[saveStatus] || { color: "text-white/40", label: "Unknown", dot: "bg-white/30" };

  return (
    <header className="flex items-center h-14 px-4 gap-3 bg-[#0e0e11] border-b border-white/5 flex-shrink-0 z-40">
      {/* Left: Logo + Back + Nav */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <Link href="/" className="flex items-center gap-2 mr-1 group">
          <span className="font-heading font-bold text-base bg-gradient-to-r from-primary to-[#69daff] bg-clip-text text-transparent">
            Nolan
          </span>
        </Link>

        <div className="h-4 w-px bg-white/10" />

        <button className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white/80 px-2 py-1 rounded-md hover:bg-white/5 transition-all">
          <ArrowLeft size={13} />
          Library
        </button>
        <button className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white/80 px-2 py-1 rounded-md hover:bg-white/5 transition-all">
          Import
        </button>

        <div className="h-4 w-px bg-white/10" />

        {/* Genre Tag */}
        <GenreTag genre={projectGenre} />

        {/* Mode Pills */}
        <div className="flex items-center gap-1 p-0.5 bg-[#1a1a1f] rounded-full border border-white/5">
          {MODES.map((mode) => (
            <button
              key={mode}
              onClick={() => setActiveMode(mode)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                activeMode === mode
                  ? "bg-gradient-to-r from-primary to-[#69daff] text-black shadow-sm"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Center: Document Title */}
      <div className="flex-1 flex items-center justify-center min-w-0">
        {editingTitle ? (
          <input
            ref={titleRef}
            defaultValue={projectTitle}
            onBlur={(e) => {
              updateProjectTitle(e.target.value);
              setEditingTitle(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "Escape") e.target.blur();
            }}
            className="bg-transparent border-b border-primary/50 text-white/80 text-sm font-medium text-center outline-none px-2 py-0.5 w-full max-w-md"
          />
        ) : (
          <button
            onClick={() => setEditingTitle(true)}
            className="text-white/60 text-sm font-medium hover:text-white/90 transition-colors truncate max-w-md px-2"
            title="Click to edit title"
          >
            {projectTitle}
          </button>
        )}
      </div>

      {/* Right: Status + Actions */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {/* Save Status */}
        <div className={`flex items-center gap-1.5 text-xs ${saveIndicator.color}`}>
          <span
            className={`w-1.5 h-1.5 rounded-full ${saveIndicator.dot} ${
              saveStatus === "saving" ? "animate-pulse" : ""
            }`}
          />
          {saveIndicator.label}
        </div>

        <div className="h-4 w-px bg-white/10" />

        <button className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg border border-white/5 transition-all">
          <Share2 size={13} />
          Share
        </button>

        <button className="p-1.5 text-white/40 hover:text-white/70 hover:bg-white/5 rounded-lg transition-all">
          <Settings size={15} />
        </button>

        <button className="p-1.5 text-white/40 hover:text-white/70 hover:bg-white/5 rounded-lg transition-all">
          <RefreshCw size={15} />
        </button>

        <Link href={`/editor/${projectId}/comic`} className="p-1.5 text-white/40 hover:text-white/70 hover:bg-white/5 hover:text-[#ba9eff] rounded-lg transition-all" title="Generate Comic">
          <Download size={15} />
        </Link>

        {/* Avatar */}
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-[#69daff] flex items-center justify-center text-black text-xs font-bold flex-shrink-0">
          T
        </div>
      </div>
    </header>
  );
}
