"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/store/authStore";

export function useCharacters(projectId) {
  const [data, setData] = useState({ project_characters: [], extracted_characters: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCharacters = useCallback(async () => {
    if (!projectId) return;

    setIsLoading(true);
    setError(null);
    try {
      const result = await apiFetch(`/api/projects/${projectId}/characters`);
      setData(result);
    } catch (err) {
      console.error("[useCharacters] Error fetching characters:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchCharacters();
  }, [fetchCharacters]);

  return {
    projectCharacters: data.project_characters,
    extractedCharacters: data.extracted_characters,
    isLoading,
    error,
    refetch: fetchCharacters,
  };
}
