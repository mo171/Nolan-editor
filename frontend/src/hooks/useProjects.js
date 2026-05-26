"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/store/authStore";

/**
 * useProjects — fetches all projects for the logged-in user.
 * Returns { projects, isLoading, error, refetch }
 */
export function useProjects() {
  const { user, isAuthenticated } = useAuth();
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProjects = useCallback(async () => {
    if (!isAuthenticated || !user?.id) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiFetch(
        `/api/projects?user_id=${user.id}`,
        {}
      );
      setProjects(data ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const deleteProject = useCallback(async (projectId) => {
    if (!isAuthenticated) return;
    
    try {
      await apiFetch(
        `/api/projects/${projectId}`,
        { method: "DELETE" }
      );
      // Optimistically update local state with a fresh array reference to trigger re-renders
      setProjects((prev) => [...prev.filter((p) => p.id !== projectId)]);
    } catch (err) {
      console.error("[useProjects] Delete failed:", err);
      throw err;
    }
  }, [isAuthenticated]);

  return { projects, isLoading, error, refetch: fetchProjects, deleteProject };
}
