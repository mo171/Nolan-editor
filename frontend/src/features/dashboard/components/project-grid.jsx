"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutGrid, List, ChevronDown } from "lucide-react";
import { useDashboard } from "@/features/dashboard/context/dashboard-context";
import {
  FeaturedProjectCard,
  SmallProjectCard,
  InitializeCard,
} from "@/features/dashboard/components/project-card";

const SORT_OPTIONS = ["Last Modified", "Alphabetical", "Progress", "Date Created"];

// ─── Sort Dropdown ────────────────────────────────────────────────────────────
function SortDropdown() {
  const { sortBy, setSortBy } = useDashboard();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

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
        id="sort-dropdown-btn"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/8 rounded-xl text-xs font-medium text-white/60 hover:text-white hover:border-white/15 transition-all duration-200"
      >
        <List size={13} />
        {sortBy}
        <ChevronDown size={11} className={`text-white/30 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full right-0 mt-1.5 z-50 bg-[#131316]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden min-w-[160px]"
          >
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() => { setSortBy(opt); setOpen(false); }}
                className={`w-full text-left px-4 py-2.5 text-xs transition-colors ${
                  opt === sortBy
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

// ─── View Toggle ──────────────────────────────────────────────────────────────
function ViewToggle() {
  const { viewMode, setViewMode } = useDashboard();
  return (
    <div className="flex items-center gap-0.5 p-0.5 bg-white/5 rounded-xl border border-white/8">
      <button
        id="view-toggle-grid"
        onClick={() => setViewMode("grid")}
        className={`p-1.5 rounded-lg transition-all duration-200 ${
          viewMode === "grid"
            ? "bg-white/10 text-white"
            : "text-white/30 hover:text-white/60"
        }`}
      >
        <LayoutGrid size={13} />
      </button>
      <button
        id="view-toggle-list"
        onClick={() => setViewMode("list")}
        className={`p-1.5 rounded-lg transition-all duration-200 ${
          viewMode === "list"
            ? "bg-white/10 text-white"
            : "text-white/30 hover:text-white/60"
        }`}
      >
        <List size={13} />
      </button>
    </div>
  );
}

// ─── Project Grid ─────────────────────────────────────────────────────────────
export function ProjectGrid() {
  const { filteredProjects } = useDashboard();

  const featured = filteredProjects.find((p) => p.featured);
  const rest = filteredProjects.filter((p) => !p.featured);

  const isEmpty = filteredProjects.length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-heading text-white leading-tight">
            Project Showcase
          </h1>
          <p className="text-sm text-white/35 mt-1">
            Manage your narrative arcs and comic panel generations from a single ethereal command center.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <SortDropdown />
          <ViewToggle />
        </div>
      </div>

      {isEmpty ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex-1 flex flex-col items-center justify-center text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 border border-primary/20">
            <LayoutGrid size={24} className="text-primary/60" />
          </div>
          <p className="text-white/50 font-semibold text-sm mb-1">No projects match your filters</p>
          <p className="text-white/25 text-xs">Try adjusting your genre or status filters</p>
        </motion.div>
      ) : (
        /* Asymmetric masonry layout matching screenshot */
        <div className="grid grid-cols-3 gap-4 auto-rows-min">
          {/* Col 1: Featured (spans 2 rows tall) */}
          {featured && (
            <div className="col-span-2 row-span-2">
              <FeaturedProjectCard project={featured} />
            </div>
          )}

          {/* Col 3: right column — top card */}
          {rest[0] && (
            <div className="col-span-1">
              <SmallProjectCard project={rest[0]} delay={0.1} />
            </div>
          )}

          {/* Col 3: right column — initialize slot */}
          <div className="col-span-1">
            <InitializeCard delay={0.15} />
          </div>

          {/* Row 2: remaining small cards */}
          {rest.slice(1).map((project, i) => (
            <div key={project.id} className="col-span-1">
              <SmallProjectCard project={project} delay={0.1 + i * 0.05} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
