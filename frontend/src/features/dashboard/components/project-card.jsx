"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Play, MoreHorizontal, Clock } from "lucide-react";
import Link from "next/link";

// ─── Progress Bar ─────────────────────────────────────────────────────────────
function ProgressBar({ progress, accentColor }) {
  return (
    <div className="w-full h-0.5 bg-white/8 rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
        className="h-full rounded-full"
        style={{
          background: `linear-gradient(90deg, ${accentColor}99, ${accentColor})`,
          boxShadow: `0 0 8px ${accentColor}66`,
        }}
      />
    </div>
  );
}

// ─── Genre Badge ──────────────────────────────────────────────────────────────
function GenreBadge({ genre }) {
  return (
    <span className="px-2 py-0.5 bg-black/40 backdrop-blur-sm border border-white/10 rounded-md text-[9px] font-bold tracking-widest text-white/70 uppercase">
      {genre}
    </span>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status, colorClass }) {
  const dotColors = {
    "In Progress": "bg-amber-400",
    Completed: "bg-emerald-400",
    Draft: "bg-white/30",
  };
  return (
    <span
      className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[9px] font-bold tracking-wider uppercase border ${colorClass}`}
    >
      <span className={`w-1 h-1 rounded-full ${dotColors[status] ?? "bg-white/30"}`} />
      {status}
    </span>
  );
}

// ─── Abstract Scene Illustration (CSS-only, no images) ───────────────────────
function CoverArt({ project, height = "h-40" }) {
  // Different abstract patterns per project
  const patterns = {
    p1: (
      // Sci-Fi: radial energy burst
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
        <div
          className="absolute w-40 h-40 rounded-full opacity-60"
          style={{
            background: `radial-gradient(circle, ${project.accentColor}55 0%, ${project.accentColor}11 50%, transparent 70%)`,
            boxShadow: `0 0 80px ${project.accentColor}44`,
          }}
        />
        <div
          className="absolute w-24 h-24 rounded-full border opacity-30"
          style={{ borderColor: project.accentColor }}
        />
        <div
          className="absolute w-12 h-12 rounded-full border-2 opacity-50"
          style={{ borderColor: project.accentColor }}
        />
        {/* Light rays */}
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute w-px opacity-20"
            style={{
              height: "80px",
              background: `linear-gradient(to top, transparent, ${project.accentColor})`,
              transform: `rotate(${i * 45}deg)`,
              transformOrigin: "bottom center",
              bottom: "50%",
              left: "50%",
            }}
          />
        ))}
        <div
          className="absolute w-3 h-3 rounded-full"
          style={{ background: project.accentColor, boxShadow: `0 0 20px ${project.accentColor}` }}
        />
      </div>
    ),
    p2: (
      // Dark Fantasy: gothic arch silhouette
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background: `radial-gradient(ellipse at 50% 110%, ${project.accentColor}22 0%, transparent 60%)`,
          }}
        />
        {/* Gothic window outline */}
        <div
          className="absolute bottom-0 w-20 h-28 border border-white/10 rounded-t-full opacity-40"
          style={{ boxShadow: `inset 0 0 30px ${project.accentColor}11` }}
        />
        <div className="absolute bottom-0 w-12 h-20 border border-white/5 rounded-t-full opacity-30" />
        {/* Fog strips */}
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="absolute w-full opacity-10"
            style={{
              height: "1px",
              background: `linear-gradient(90deg, transparent, ${project.accentColor}, transparent)`,
              bottom: `${i * 12}px`,
            }}
          />
        ))}
      </div>
    ),
    p3: (
      // Fantasy Forest: tree silhouettes
      <div className="absolute inset-0 overflow-hidden">
        {/* Misty background */}
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse at 50% 80%, ${project.accentColor}18 0%, transparent 70%)`,
          }}
        />
        {/* Tree trunks */}
        {[15, 30, 50, 65, 80].map((pos, i) => (
          <div key={i} className="absolute bottom-0" style={{ left: `${pos}%` }}>
            <div
              className="w-px opacity-50"
              style={{
                height: `${40 + i * 8}px`,
                background: `linear-gradient(to top, ${project.accentColor}30, transparent)`,
                width: i === 2 ? "2px" : "1px",
              }}
            />
          </div>
        ))}
        {/* Firefly dots */}
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full opacity-60"
            style={{
              width: "2px",
              height: "2px",
              background: project.accentColor,
              boxShadow: `0 0 4px ${project.accentColor}`,
              left: `${20 + i * 12}%`,
              top: `${30 + (i % 3) * 20}%`,
            }}
          />
        ))}
      </div>
    ),
    p4: (
      // Noir: rain streaks and lamp glow
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full opacity-25"
          style={{ background: `radial-gradient(circle, ${project.accentColor}, transparent 70%)` }}
        />
        {/* Rain streaks */}
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute opacity-10"
            style={{
              width: "1px",
              height: `${6 + (i % 3) * 4}px`,
              background: "white",
              left: `${8 + i * 8}%`,
              top: `${15 + (i % 4) * 15}%`,
              transform: "rotate(10deg)",
            }}
          />
        ))}
        {/* Smoke wisp */}
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 w-8 h-12 opacity-15"
          style={{
            background: `radial-gradient(ellipse at 50% 100%, white 0%, transparent 70%)`,
            filter: "blur(4px)",
          }}
        />
      </div>
    ),
  };

  return (
    <div className={`relative ${height} w-full overflow-hidden rounded-xl`}>
      {/* Gradient base */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${project.coverGradient}`}
      />
      {/* Abstract art */}
      {patterns[project.id] ?? null}
      {/* Subtle noise overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "200px",
        }}
      />
    </div>
  );
}

// ─── Featured (Large) Project Card ───────────────────────────────────────────
export function FeaturedProjectCard({ project }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      id={`project-card-${project.id}`}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className="relative group cursor-pointer rounded-2xl overflow-hidden bg-[#131316] border border-white/5 hover:border-white/12 transition-all duration-300"
      style={{
        boxShadow: hovered
          ? `0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08), inset 0 0 40px ${project.glowColor}`
          : "0 4px 20px rgba(0,0,0,0.3)",
      }}
    >
      {/* Cover Art */}
      <CoverArt project={project} height="h-48" />

      {/* Badges overlay on image */}
      <div className="absolute top-3 left-3 flex items-center gap-2">
        <GenreBadge genre={project.genre} />
        <StatusBadge status={project.status} colorClass={project.statusColor} />
      </div>

      {/* Play button */}
      <Link href="/editor">
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: hovered ? 1 : 0, scale: hovered ? 1 : 0.8 }}
          transition={{ duration: 0.2 }}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm border border-white/15 flex items-center justify-center text-white/80 hover:text-white hover:bg-black/70 transition-all"
        >
          <Play size={14} fill="currentColor" />
        </motion.button>
      </Link>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-white font-bold text-lg font-heading leading-tight mb-1 group-hover:text-white transition-colors">
          {project.title}
        </h3>
        <div className="flex items-center gap-1.5 mb-3">
          <Clock size={11} className="text-white/25" />
          <span className="text-[11px] text-white/35">
            Last Edited {project.lastEdited}
          </span>
          <span className="text-white/15 mx-1">•</span>
          <span className="text-[11px] text-white/35">{project.meta}</span>
        </div>

        {/* Progress */}
        <div className="space-y-1.5">
          <ProgressBar progress={project.progress} accentColor={project.accentColor} />
          <div className="flex justify-end">
            <span className="text-[11px] font-semibold" style={{ color: project.accentColor }}>
              {project.progress}% Complete
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Small Project Card ───────────────────────────────────────────────────────
export function SmallProjectCard({ project, delay = 0 }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      id={`project-card-${project.id}`}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut", delay }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className="group relative cursor-pointer rounded-2xl overflow-hidden bg-[#131316] border border-white/5 hover:border-white/12 transition-all duration-300 flex flex-col"
      style={{
        boxShadow: hovered
          ? `0 12px 40px rgba(0,0,0,0.5), inset 0 0 30px ${project.glowColor}`
          : "0 4px 16px rgba(0,0,0,0.25)",
      }}
    >
      {/* Cover Art (smaller) */}
      <CoverArt project={project} height="h-28" />

      {/* Badges */}
      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
        <GenreBadge genre={project.genre} />
      </div>

      {/* Content */}
      <div className="p-3 flex flex-col flex-1">
        <h3 className="text-white/90 font-bold text-sm font-heading leading-snug mb-1 group-hover:text-white transition-colors line-clamp-2">
          {project.title}
        </h3>
        <div className="flex items-center gap-1 mb-2.5">
          <Clock size={10} className="text-white/20 flex-shrink-0" />
          <span className="text-[10px] text-white/30 truncate">
            Last Edited {project.lastEdited} • {project.meta}
          </span>
        </div>

        <div className="mt-auto space-y-1">
          <ProgressBar progress={project.progress} accentColor={project.accentColor} />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white/25">{project.status}</span>
            <span className="text-[10px] font-semibold" style={{ color: project.accentColor }}>
              {project.progress}%
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Initialize / CTA Card ───────────────────────────────────────────────────
export function InitializeCard({ delay = 0 }) {
  return (
    <motion.div
      id="initialize-manuscript-card"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut", delay }}
    >
      <Link href="/editor">
        <div className="group relative cursor-pointer rounded-2xl border border-dashed border-white/10 hover:border-primary/30 bg-[#0e0e11] hover:bg-primary/5 transition-all duration-300 flex flex-col items-center justify-center p-6 h-full min-h-[140px]">
          {/* Glowing plus */}
          <div className="w-10 h-10 rounded-full border border-white/10 group-hover:border-primary/40 flex items-center justify-center mb-3 group-hover:shadow-[0_0_20px_rgba(186,158,255,0.2)] transition-all duration-300">
            <span className="text-white/20 group-hover:text-primary/70 text-2xl leading-none transition-colors">+</span>
          </div>
          <span className="text-white/70 group-hover:text-white text-sm font-bold font-heading transition-colors text-center">
            Initialize Manuscript
          </span>
          <span className="text-white/25 group-hover:text-white/50 text-[11px] mt-1 text-center transition-colors">
            Start a new AI-guided creative journey
          </span>
        </div>
      </Link>
    </motion.div>
  );
}
