"use client";

import React from "react";
import Link from "next/link";
import {
  Settings2,
  Cpu,
  BookA,
  ArrowDownToLine,
  ShieldAlert,
  Settings,
} from "lucide-react";

const NAV_ITEMS = [
  { icon: Settings2,       label: "Project Setup",   href: "/project", active: true },
];

function NavItem({ icon: Icon, label, href, active }) {
  return (
    <Link
      href={href}
      className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
        active
          ? "bg-primary/15 text-primary"
          : "text-white/40 hover:text-white/80 hover:bg-white/5"
      }`}
    >
      <Icon
        size={14}
        className={`flex-shrink-0 ${
          active ? "text-primary" : "text-white/25 group-hover:text-white/60"
        }`}
      />
      {label}
    </Link>
  );
}

export function ProjectSidebar() {
  return (
    <aside className="w-[200px] flex-shrink-0 h-full bg-[#0c0c0f] border-r border-white/5 flex flex-col">
      {/* Project badge */}
      <div className="px-4 py-5 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-[#69daff] flex items-center justify-center text-black font-bold text-sm flex-shrink-0 shadow-lg shadow-primary/20">
            N
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-white/90 font-heading truncate leading-tight">
              Neon Dreams
            </div>
            <div className="text-[9px] font-bold tracking-widest text-white/30 uppercase mt-0.5">
              AI Narrative v1.2
            </div>
          </div>
        </div>
      </div>

      {/* Workspace label */}
      <div className="px-4 pt-5 pb-2 flex-shrink-0">
        <span className="text-[10px] font-bold tracking-widest text-white/20 uppercase">
          Workspace
        </span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto scrollbar-thin">
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.label} {...item} />
        ))}
      </nav>

      {/* Bottom: Settings */}
      <div className="px-2 py-4 border-t border-white/5 flex-shrink-0">
        <Link
          href="#"
          className="group flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-white/30 hover:text-white/70 hover:bg-white/5 transition-all duration-200"
        >
          <Settings size={14} className="group-hover:text-white/60 transition-colors" />
          Settings
        </Link>
      </div>
    </aside>
  );
}
