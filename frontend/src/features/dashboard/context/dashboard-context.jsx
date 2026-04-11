"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useProjects } from "@/hooks/useProjects";

// Removed MOCK_PROJECTS

const GENRES = ["All Genres", "Sci-Fi", "Fantasy", "Horror", "Romance", "Thriller", "Drama", "Mystery", "Action"];
const STATUSES = ["Draft", "In Progress", "Completed"];

// ─── Context ──────────────────────────────────────────────────────────────────
const DashboardContext = createContext(null);

export function DashboardProvider({ children }) {
  // Real projects from backend — starts empty, loads on mount
  const { projects: fetchedProjects, isLoading, error, refetch, deleteProject } = useProjects();
  const [projects, setProjects] = useState([]);

  // Sync fetched projects into local state so we can still filter/sort
  useEffect(() => {
    if (!isLoading && fetchedProjects) {
      const enriched = fetchedProjects.map((p, i) => {
        // Derive some default UI states since DB doesn't have all these yet
        const updatedDate = new Date(p.updated_at || p.created_at);
        const daysOld = (Date.now() - updatedDate.getTime()) / (1000 * 3600 * 24);
        
        let status = "Draft";
        if (daysOld < 2) status = "In Progress";
        else if (daysOld > 30) status = "Completed";

        // Visuals derived from genre
        const genreLower = (p.genre || "").toLowerCase();
        let patternKey = "p1"; // Sci-Fi default
        let visuals = { accentColor: "#69daff", glowColor: "rgba(105,218,255,0.35)", coverGradient: "from-[#140a2e] via-[#0d1f4a] to-[#051a3a]" };
        
        if (genreLower.includes("fantasy") || genreLower.includes("magic")) {
           patternKey = "p2";
           visuals = { accentColor: "#ba9eff", glowColor: "rgba(186,158,255,0.3)", coverGradient: "from-[#0a0612] via-[#150d22] to-[#0f0a1a]" };
        } else if (genreLower.includes("forest") || genreLower.includes("nature") || genreLower.includes("adventure")) {
           patternKey = "p3";
           visuals = { accentColor: "#4ade80", glowColor: "rgba(74,222,128,0.25)", coverGradient: "from-[#071a10] via-[#0d2b16] to-[#051208]" };
        } else if (genreLower.includes("mystery") || genreLower.includes("noir") || genreLower.includes("thriller")) {
           patternKey = "p4";
           visuals = { accentColor: "#f59e0b", glowColor: "rgba(245,158,11,0.2)", coverGradient: "from-[#0f0d09] via-[#1a1610] to-[#0a0906]" };
        }

        let statusColor = "bg-white/10 text-white/50 border-white/10";
        if (status === "In Progress") statusColor = "bg-amber-400/20 text-amber-300 border-amber-400/30";
        if (status === "Completed") statusColor = "bg-emerald-400/20 text-emerald-300 border-emerald-400/30";

        return {
          ...p,
          genre: p.genre || "Uncategorized",
          status,
          progress: p.word_count ? Math.min(Math.round(p.word_count / 1000 * 100), 100) : (i === 0 ? 65 : 15),
          lastEdited: updatedDate.toLocaleDateString(),
          meta: "Story Phase",
          featured: i === 0, // Just feature the most recently modified one
          patternKey,
          ...visuals,
          statusColor
        };
      });
      setProjects(enriched);
    }
  }, [fetchedProjects, isLoading]);
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
    const genreMatch = selectedGenre === "All Genres" || (p.genre && p.genre.includes(selectedGenre));
    const statusMatch = selectedStatuses.length === 0 || (p.status && selectedStatuses.includes(p.status));
    const safeTitle = p.title || "";
    const safeGenre = p.genre || "";
    const searchMatch =
      searchQuery === "" ||
      safeTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      safeGenre.toLowerCase().includes(searchQuery.toLowerCase());
    return genreMatch && statusMatch && searchMatch;
  });

  // Direct state update for Nuclear Sync
  const deleteProjectLocal = async (projectId) => {
    try {
      await deleteProject(projectId);
      // Force immediate local state update for "Real Time" feel
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
    } catch (err) {
      // Error is already logged in the hook, but we re-throw to be caught by UI
      throw err;
    }
  };

  return (
    <DashboardContext.Provider
      value={{
        projects,
        setProjects,
        filteredProjects,
        isLoading,
        error,
        refetch,
        deleteProject: deleteProjectLocal, // Use the enhanced local version
        stats: {
          total: projects.length,
          words: projects.reduce((acc, p) => acc + (p.words || 0), 0),
          lastActive: projects[0]?.title || "None",
        },
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
