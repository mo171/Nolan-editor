"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

// ─── Mock Data ────────────────────────────────────────────────────────────────
const MOCK_PROJECTS = [
  {
    id: "p1",
    title: "Neon Drifters: Zero Hour",
    genre: "Sci-Fi Epic",
    status: "In Progress",
    progress: 65,
    lastEdited: "2 hours ago",
    meta: "Narrative Arc 4/12",
    featured: true,
    coverGradient: "from-[#140a2e] via-[#0d1f4a] to-[#051a3a]",
    accentColor: "#69daff",
    glowColor: "rgba(105,218,255,0.35)",
    statusColor: "bg-amber-400/20 text-amber-300 border-amber-400/30",
  },
  {
    id: "p2",
    title: "The Void's Echo",
    genre: "Grim Dark Fantasy",
    status: "Completed",
    progress: 100,
    lastEdited: "3 days ago",
    meta: "Episode 1 Finished",
    featured: false,
    coverGradient: "from-[#0a0612] via-[#150d22] to-[#0f0a1a]",
    accentColor: "#ba9eff",
    glowColor: "rgba(186,158,255,0.3)",
    statusColor: "bg-emerald-400/20 text-emerald-300 border-emerald-400/30",
  },
  {
    id: "p3",
    title: "Whispers of Sylvan",
    genre: "Fantasy",
    status: "Draft",
    progress: 15,
    lastEdited: "Yesterday",
    meta: "Script Phase",
    featured: false,
    coverGradient: "from-[#071a10] via-[#0d2b16] to-[#051208]",
    accentColor: "#4ade80",
    glowColor: "rgba(74,222,128,0.25)",
    statusColor: "bg-white/10 text-white/50 border-white/10",
  },
  {
    id: "p4",
    title: "Shadows of 42nd St",
    genre: "Noir Mystery",
    status: "Draft",
    progress: 25,
    lastEdited: "1 week ago",
    meta: "Act II Blocked",
    featured: false,
    coverGradient: "from-[#0f0d09] via-[#1a1610] to-[#0a0906]",
    accentColor: "#f59e0b",
    glowColor: "rgba(245,158,11,0.2)",
    statusColor: "bg-white/10 text-white/50 border-white/10",
  },
];

const GENRES = ["All Genres", "Sci-Fi", "Fantasy", "Horror", "Romance", "Thriller", "Drama", "Mystery", "Action"];
const STATUSES = ["Draft", "In Progress", "Completed"];

// ─── Context ──────────────────────────────────────────────────────────────────
const DashboardContext = createContext(null);

export function DashboardProvider({ children }) {
  const [projects, setProjects] = useState(MOCK_PROJECTS);
  const [activeSection, setActiveSection] = useState("all"); // all | favorites | templates
  const [selectedGenre, setSelectedGenre] = useState("All Genres");
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [sortBy, setSortBy] = useState("Last Modified");
  const [viewMode, setViewMode] = useState("grid"); // grid | list
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleStatus = useCallback((status) => {
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  }, []);

  const filteredProjects = projects.filter((p) => {
    const genreMatch = selectedGenre === "All Genres" || p.genre.includes(selectedGenre);
    const statusMatch = selectedStatuses.length === 0 || selectedStatuses.includes(p.status);
    const searchMatch =
      searchQuery === "" ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.genre.toLowerCase().includes(searchQuery.toLowerCase());
    return genreMatch && statusMatch && searchMatch;
  });

  return (
    <DashboardContext.Provider
      value={{
        projects,
        setProjects,
        filteredProjects,
        activeSection,
        setActiveSection,
        selectedGenre,
        setSelectedGenre,
        selectedStatuses,
        toggleStatus,
        sortBy,
        setSortBy,
        viewMode,
        setViewMode,
        searchQuery,
        setSearchQuery,
        sidebarOpen,
        setSidebarOpen,
        GENRES,
        STATUSES,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used within DashboardProvider");
  return ctx;
}
