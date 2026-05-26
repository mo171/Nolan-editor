"use client";

import { useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/store/authStore";

export function useTimeline(projectId) {
  const [timeline, setTimeline] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCharacterTimeline = useCallback(async (characterName) => {
    if (!projectId || !characterName) return null;

    setIsLoading(true);
    setError(null);
    try {
      const result = await apiFetch(
        `/api/projects/${projectId}/characters/${encodeURIComponent(characterName)}/timeline`,
        {}
      );
      setTimeline(result.timeline_scenes || []);
      return result.timeline_scenes;
    } catch (err) {
      console.error("[useTimeline] Error fetching timeline:", err);
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  return {
    timeline,
    isLoading,
    error,
    fetchCharacterTimeline,
  };
}
