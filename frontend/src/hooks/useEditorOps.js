"use client";

import { useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/store/authStore";

/**
 * useEditorOps — Chapter and Scene CRUD operations.
 * Uses optimistic updates: caller updates local state first,
 * then this syncs to the backend. On failure, caller should revert.
 */
export function useEditorOps() {
  // ── Chapters ──────────────────────────────────────────────────────────────

  const createChapter = useCallback(async (projectId, title) => {
    return apiFetch("/api/chapters", {
      method: "POST",
      body: JSON.stringify({ project_id: projectId, title }),
    });
  }, []);

  const updateChapterTitle = useCallback(async (chapterId, title) => {
    return apiFetch(`/api/chapters/${chapterId}`, {
      method: "PATCH",
      body: JSON.stringify({ title }),
    });
  }, []);

  const deleteChapter = useCallback(async (chapterId) => {
    return apiFetch(`/api/chapters/${chapterId}`, {
      method: "DELETE",
    });
  }, []);

  // ── Scenes ────────────────────────────────────────────────────────────────

  const createScene = useCallback(async (chapterId, title) => {
    return apiFetch("/api/scenes", {
      method: "POST",
      body: JSON.stringify({ chapter_id: chapterId, title }),
    });
  }, []);

  const updateSceneTitle = useCallback(async (sceneId, title) => {
    return apiFetch(`/api/scenes/${sceneId}/title`, {
      method: "PATCH",
      body: JSON.stringify({ title }),
    });
  }, []);

  const deleteScene = useCallback(async (sceneId) => {
    return apiFetch(`/api/scenes/${sceneId}`, {
      method: "DELETE",
    });
  }, []);

  return {
    createChapter,
    updateChapterTitle,
    deleteChapter,
    createScene,
    updateSceneTitle,
    deleteScene,
  };
}
