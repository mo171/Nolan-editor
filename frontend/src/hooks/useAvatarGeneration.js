"use client";

import { useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

export function useAvatarGeneration(projectId, allCharacters, onSuccess) {
  const pendingChars = allCharacters?.filter(c => !c.image_url) || [];
  
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  
  const [formState, setFormState] = useState({
    visual_description: "",
    age: "",
    clothing: "",
    art_style: ""
  });

  const currentChar = pendingChars[currentCharIndex];

  // Pre-fill some defaults if changing char
  const setCharIndex = (index) => {
    setCurrentCharIndex(index);
    const newChar = pendingChars[index];
    if (newChar) {
      setFormState({
        visual_description: newChar.description || "",
        age: "",
        clothing: "",
        art_style: "Cinematic Narrative Concept Art",
      });
      setError(null);
    }
  };

  const generateAvatar = async () => {
    if (!currentChar || !projectId) return;
    
    try {
      setIsGenerating(true);
      setError(null);
      
      const payload = {
        visual_description: formState.visual_description,
        age: formState.age,
        clothing: formState.clothing,
        art_style: formState.art_style
      };
      
      const res = await apiFetch(`/api/projects/${projectId}/characters/${currentChar.name}/generate-image`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (res.status === 'ok') {
        // success!
        if (onSuccess) {
          onSuccess(currentChar.name, res.image_url, res.ai_visual_summary);
        }
      } else {
        throw new Error(res.message || "Failed to generate image");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    pendingChars,
    currentChar,
    currentCharIndex,
    setCharIndex,
    formState,
    setFormState,
    isGenerating,
    error,
    generateAvatar
  };
}
