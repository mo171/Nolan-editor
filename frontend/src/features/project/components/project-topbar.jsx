"use client";

import React from "react";
import Link from "next/link";

const TOP_NAV = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Editor", href: "/editor" },
];

export function ProjectTopbar() {
  return (
    <header className="flex items-center h-12 px-6 bg-[#0e0e11] border-b border-white/5 flex-shrink-0 z-40">
      {/* Logo */}
      <Link href="/" className="mr-8 flex-shrink-0">
        <span className="font-heading font-bold text-base bg-gradient-to-r from-primary to-[#69daff] bg-clip-text text-transparent">
          Nolan Studio
        </span>
      </Link>

      {/* Nav tabs */}
      <nav className="flex items-center gap-6 flex-1">
        {TOP_NAV.map((item) => {
          return (
            <Link
              key={item.label}
              href={item.href}
              className="text-xs font-semibold pb-px transition-colors text-white/35 hover:text-white/70"
            >
              {item.label.toUpperCase()}
            </Link>
          );
        })}
      </nav>

      {/* Right actions */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <button className="px-4 py-1.5 text-xs font-semibold text-white/60 border border-white/10 rounded-xl hover:border-white/25 hover:text-white transition-all duration-200">
          Collaborate
        </button>
        <Link
          href="/editor"
          className="px-4 py-1.5 text-xs font-bold text-black bg-gradient-to-r from-primary to-[#69daff] rounded-xl hover:opacity-90 hover:scale-105 hover:shadow-[0_0_16px_rgba(186,158,255,0.3)] active:scale-95 transition-all duration-200"
        >
          New Story
        </Link>
        {/* Avatar */}
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-[#69daff] flex items-center justify-center text-black text-xs font-bold flex-shrink-0">
          T
        </div>
      </div>
    </header>
  );
}
