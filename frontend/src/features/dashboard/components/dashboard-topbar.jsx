"use client";

import React, { useRef, useEffect } from "react";
import { Search, Bell, Plus } from "lucide-react";
import { useDashboard } from "@/features/dashboard/context/dashboard-context";
import Link from "next/link";

export function DashboardTopbar() {
  const { searchQuery, setSearchQuery } = useDashboard();
  const inputRef = useRef(null);

  // Global "/" shortcut focuses search
  useEffect(() => {
    function handler(e) {
      if (e.key === "/" && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <header className="flex items-center gap-4 h-14 px-6 bg-[#0e0e11]/80 backdrop-blur-xl border-b border-white/5 flex-shrink-0 z-40">
      {/* Search Bar */}
      <div className="flex-1 max-w-md relative">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none"
        />
        <input
          ref={inputRef}
          id="dashboard-search-input"
          type="text"
          placeholder="Search manuscripts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-12 py-2 bg-white/5 border border-white/8 rounded-xl text-sm text-white/80 placeholder-white/25 outline-none focus:border-primary/40 focus:bg-white/8 transition-all duration-200 focus:shadow-[0_0_0_3px_rgba(186,158,255,0.08)]"
        />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-white/20 bg-white/5 border border-white/8 rounded px-1.5 py-0.5 font-mono">
          /
        </kbd>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3 ml-auto">
        {/* Bell */}
        <button
          id="topbar-notifications-btn"
          className="relative p-2 text-white/40 hover:text-white/80 hover:bg-white/5 rounded-xl transition-all duration-200 group"
        >
          <Bell size={17} />
          {/* Dot */}
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_6px_rgba(186,158,255,0.8)]" />
        </button>

        {/* New Project */}
        <Link
          href="/project"
          id="new-project-btn"
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-[#69daff] text-black text-sm font-bold rounded-xl hover:opacity-90 hover:scale-105 hover:shadow-[0_0_20px_rgba(186,158,255,0.35)] active:scale-95 transition-all duration-200"
        >
          <Plus size={15} />
          New Project
        </Link>
      </div>
    </header>
  );
}
