"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/store/authStore";

/**
 * useCreateProject — POSTs the wizard form data to /api/projects
 * Maps frontend camelCase field names → backend snake_case schema.
 */
export function useCreateProject() {
  const { user } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState(null);

  async function createProject(formData) {
    setIsCreating(true);
    setError(null);
    try {
      const payload = {
        user_id:              user?.id ?? "",
        title:                formData.title,
        genre:                formData.genre,
        premise:              formData.premise,
        desired_ending:       formData.desiredEnding,
        themes:               formData.themes ?? [],
        llm_temperature:      formData.llmTemperature ?? 0.5,
        // Extended project context — feeds the ghost text system prompt boilerplate
        tone:                 formData.tone,
        target_audience:      formData.targetAudience,
        setting_description:  formData.settingDescription,
        story_foundation:     formData.storyFoundation,
        conflict_types:       formData.conflictTypes ?? [],
        tension_tags:         formData.tensionTags ?? [],
        inciting_incident:    formData.incitingIncident,
        characters: (formData.characters ?? []).map((c) => ({
          name:        c.name,
          role:        c.role,
          description: c.description,
          traits:      c.traits ?? [],
        })),
      };

      const project = await apiFetch("/api/projects", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      return project; // { id, title, ... }
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsCreating(false);
    }
  }

  return { createProject, isCreating, error };
}
