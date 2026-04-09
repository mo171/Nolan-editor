"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FolderOpen,
  Star,
  Layout,
  Archive,
  Trash2,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useDashboard } from "@/features/dashboard/context/dashboard-context";

// ─── Genre Dropdown ──────────────────────────────────────────────────────────
function GenreDropdown() {
  const { selectedGenre, setSelectedGenre, GENRES } = useDashboard();
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
        id="genre-dropdown-btn"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-[#1a1a1f] border border-white/8 text-white/70 text-xs font-medium hover:border-primary/30 hover:text-white transition-all duration-200"
      >
        <span>{selectedGenre}</span>
        <ChevronDown
          size={12}
          className={`text-white/30 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-1.5 left-0 right-0 z-50 bg-[#131316]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden"
          >
            {GENRES.map((g) => (
              <button
                key={g}
                onClick={() => {
                  setSelectedGenre(g);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                  g === selectedGenre
                    ? "text-primary font-semibold bg-primary/10"
                    : "text-white/60 hover:text-white hover:bg-white/5"
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

// ─── Sidebar Section Label ─────────────────────────────────────────────────
function SectionLabel({ label }) {
  return (
    <span className="px-3 text-[10px] font-bold tracking-widest text-white/25 uppercase">
      {label}
    </span>
  );
}

// ─── Sidebar Nav Item ─────────────────────────────────────────────────────────
function NavItem({ icon: Icon, label, sectionKey, active, onClick }) {
  return (
    <button
      id={`sidebar-nav-${sectionKey}`}
      onClick={onClick}
      className={`group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
        active
          ? "bg-primary/15 text-primary"
          : "text-white/45 hover:text-white/80 hover:bg-white/5"
      }`}
    >
      <Icon
        size={14}
        className={`flex-shrink-0 transition-colors ${
          active ? "text-primary" : "text-white/30 group-hover:text-white/60"
        }`}
      />
      {label}
    </button>
  );
}

// ─── Collapsed Rail (icon-only strip) ────────────────────────────────────────
function CollapsedRail({ onOpen }) {
  const { activeSection, setActiveSection } = useDashboard();

  const NAV_ITEMS = [
    { icon: FolderOpen, sectionKey: "all" },
    { icon: Star,       sectionKey: "favorites" },
    { icon: Layout,     sectionKey: "templates" },
    { icon: Archive,    sectionKey: "archive" },
    { icon: Trash2,     sectionKey: "trash" },
  ];

  return (
    <motion.div
      key="collapsed"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="flex flex-col items-center py-4 gap-1 h-full"
    >
      {/* Re-open button at top */}
      <button
        id="sidebar-open-btn"
        onClick={onOpen}
        title="Expand sidebar"
        className="p-2.5 mb-3 text-white/30 hover:text-primary hover:bg-primary/10 rounded-xl transition-all duration-200 group"
      >
        <PanelLeftOpen size={16} className="group-hover:scale-110 transition-transform" />
      </button>

      {/* Icon nav */}
      {NAV_ITEMS.map(({ icon: Icon, sectionKey }) => (
        <button
          key={sectionKey}
          id={`sidebar-icon-${sectionKey}`}
          onClick={() => setActiveSection(sectionKey)}
          title={sectionKey}
          className={`p-2.5 rounded-xl transition-all duration-200 group ${
            activeSection === sectionKey
              ? "bg-primary/15 text-primary"
              : "text-white/25 hover:text-white/70 hover:bg-white/5"
          }`}
        >
          <Icon size={15} className="group-hover:scale-110 transition-transform" />
        </button>
      ))}
    </motion.div>
  );
}

// ─── Main Sidebar ─────────────────────────────────────────────────────────────
export function DashboardSidebar() {
  const {
    activeSection,
    setActiveSection,
    selectedStatuses,
    toggleStatus,
    STATUSES,
    sidebarOpen,
    setSidebarOpen,
  } = useDashboard();

  return (
    <motion.aside
      animate={{ width: sidebarOpen ? 220 : 56 }}
      transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
      className="relative flex-shrink-0 h-full bg-[#0c0c0f] border-r border-white/5 overflow-hidden"
      style={{ minWidth: sidebarOpen ? 220 : 56 }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {sidebarOpen ? (
          /* ── Expanded State ─────────────────────────────────────────────── */
          <motion.div
            key="expanded"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col h-full w-[220px]"
          >
            {/* Logo + User + Close Button */}
            <div className="px-4 py-5 flex-shrink-0 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-[#69daff] flex items-center justify-center text-black font-bold text-sm flex-shrink-0 shadow-lg shadow-primary/20">
                  M
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-white/90 font-heading truncate leading-tight">
                    Manuscript
                  </div>
                  <div className="text-[9px] font-bold tracking-widest text-white/30 uppercase mt-0.5">
                    AI Storytelling
                  </div>
                </div>
              </div>

              {/* Close / collapse button */}
              <button
                id="sidebar-close-btn"
                onClick={() => setSidebarOpen(false)}
                title="Collapse sidebar"
                className="p-1.5 text-white/20 hover:text-white/70 hover:bg-white/8 rounded-lg transition-all duration-200 flex-shrink-0 group"
              >
                <PanelLeftClose size={15} className="group-hover:scale-105 transition-transform" />
              </button>
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto px-2 py-4 space-y-5 scrollbar-thin">
              {/* Workspace */}
              <div className="space-y-1">
                <SectionLabel label="Workspace" />
                <div className="mt-2 space-y-0.5">
                  <NavItem
                    icon={FolderOpen}
                    label="All Projects"
                    sectionKey="all"
                    active={activeSection === "all"}
                    onClick={() => setActiveSection("all")}
                  />
                  <NavItem
                    icon={Star}
                    label="Favorites"
                    sectionKey="favorites"
                    active={activeSection === "favorites"}
                    onClick={() => setActiveSection("favorites")}
                  />
                  <NavItem
                    icon={Layout}
                    label="Templates"
                    sectionKey="templates"
                    active={activeSection === "templates"}
                    onClick={() => setActiveSection("templates")}
                  />
                </div>
              </div>

              {/* Filters */}
              <div className="space-y-3">
                <SectionLabel label="Filters" />

                {/* Genre Filter */}
                <div className="space-y-1.5 px-1">
                  <span className="text-[10px] text-white/30 font-semibold uppercase tracking-wider px-2">
                    Genre
                  </span>
                  <GenreDropdown />
                </div>

                {/* Status Filter */}
                <div className="space-y-2 px-1">
                  <span className="text-[10px] text-white/30 font-semibold uppercase tracking-wider px-2">
                    Status
                  </span>
                  <div className="flex flex-wrap gap-1.5 px-1">
                    {STATUSES.map((s) => {
                      const active = selectedStatuses.includes(s);
                      return (
                        <button
                          key={s}
                          id={`status-filter-${s.toLowerCase().replace(/\s+/g, "-")}`}
                          onClick={() => toggleStatus(s)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all duration-200 ${
                            active
                              ? "bg-primary/20 border-primary/40 text-primary"
                              : "bg-white/5 border-white/8 text-white/40 hover:border-white/20 hover:text-white/60"
                          }`}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="px-2 py-3 border-t border-white/5 space-y-0.5 flex-shrink-0">
              <NavItem
                icon={Archive}
                label="Archive"
                sectionKey="archive"
                active={activeSection === "archive"}
                onClick={() => setActiveSection("archive")}
              />
              <NavItem
                icon={Trash2}
                label="Trash"
                sectionKey="trash"
                active={activeSection === "trash"}
                onClick={() => setActiveSection("trash")}
              />
            </div>
          </motion.div>
        ) : (
          /* ── Collapsed State ─────────────────────────────────────────── */
          <CollapsedRail onOpen={() => setSidebarOpen(true)} />
        )}
      </AnimatePresence>
    </motion.aside>
  );
}
