"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/store/authStore";

/**
 * useProjectData — fetches a single project's full data (metadata + chapters + scenes)
 * Drives the editor's initial state hydration.
 */
export function useProjectData(projectId) {
  const [projectData, setProjectData] = useState(null);
  const [isLoading, setIsLoading] = useState(!!projectId);
  const [error, setError] = useState(null);

  const fetchProject = useCallback(async () => {
    if (!projectId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiFetch(
        `/api/projects/${projectId}`,
        {}
      );
      setProjectData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  return { projectData, isLoading, error, refetch: fetchProject };
}
