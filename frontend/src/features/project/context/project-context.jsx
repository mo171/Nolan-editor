"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useCreateProject } from "@/hooks/useCreateProject";
import { useDnaUpload } from "@/hooks/useDnaUpload";

// ─── Step definitions ─────────────────────────────────────────────────────────
export const WIZARD_STEPS = [
  { id: 0, label: "Basic Info",   code: "01" },
  { id: 1, label: "World Setup",  code: "02" },
  { id: 2, label: "The Cast",     code: "03" },
  { id: 3, label: "Conflict",     code: "04" },
];

const INITIAL_FORM = {
  // Step 1 — Basic Info
  title: "",
  genre: "",
  tone: "",
  targetAudience: "",
  settingDescription: "",
  // Step 2 — World Setup
  premise: "",
  desiredEnding: "",
  themes: [],
  llmTemperature: 0.7,
  dnaFile: null,         // File object — UI only, no upload
  // Step 3 — The Cast
  characters: [],
  // Step 4 — Conflict
  conflictTypes: [],
  tensionTags: [],
  incitingIncident: "",
};

// ─── Context ──────────────────────────────────────────────────────────────────
const ProjectContext = createContext(null);

export function ProjectProvider({ children }) {
  const router = useRouter();
  const { createProject, isCreating } = useCreateProject();
  const { uploadDna, isUploading } = useDnaUpload();

  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [submitStatus, setSubmitStatus] = useState("idle"); // idle | submitting | success | error
  const [toasts, setToasts] = useState([]);

  // ── Field updater ─────────────────────────────────────────────────────────
  const updateField = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  // ── Toast helpers ─────────────────────────────────────────────────────────
  const addToast = useCallback((message, type = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── Character CRUD ────────────────────────────────────────────────────────
  const addCharacter = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      characters: [
        ...prev.characters,
        { id: Date.now(), name: "", role: "protagonist", description: "", traits: [] },
      ],
    }));
  }, []);

  const updateCharacter = useCallback((id, field, value) => {
    setFormData((prev) => ({
      ...prev,
      characters: prev.characters.map((c) =>
        c.id === id ? { ...c, [field]: value } : c
      ),
    }));
  }, []);

  const removeCharacter = useCallback((id) => {
    setFormData((prev) => ({
      ...prev,
      characters: prev.characters.filter((c) => c.id !== id),
    }));
  }, []);

  // ── Step navigation ───────────────────────────────────────────────────────
  const goToStep = useCallback((step) => {
    setActiveStep(Math.max(0, Math.min(3, step)));
  }, []);

  const goNext = useCallback(() => {
    if (activeStep < 3) {
      setActiveStep((s) => s + 1);
    }
  }, [activeStep]);

  const goBack = useCallback(() => {
    if (activeStep > 0) {
      setActiveStep((s) => s - 1);
    }
  }, [activeStep]);

  // ── Submit (wired to real backend) ─────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    setSubmitStatus("submitting");
    try {
      // 1. POST project to backend — returns { id, title, ... }
      const project = await createProject(formData);

      // 2. If user uploaded a DNA file, kick off background indexing
      if (formData.dnaFile && project.id) {
        addToast("Embedding narrative DNA... AI will improve over time.", "info");
        // uploadDna returns immediately (202) — indexing runs in the backend
        await uploadDna(project.id, formData.dnaFile).catch((err) => {
          addToast(`DNA upload failed: ${err.message}`, "error");
        });
      }

      setSubmitStatus("success");
      addToast("Narrative universe created! Routing to editor…", "success");

      // 3. Navigate to editor with the real project ID
      setTimeout(() => router.push(`/editor/${project.id}`), 800);
    } catch (error) {
      setSubmitStatus("error");
      addToast(error.message || "Failed to create project", "error");
    }
  }, [formData, addToast, router, createProject, uploadDna]);

  return (
    <ProjectContext.Provider
      value={{
        activeStep,
        formData,
        submitStatus,
        isUploading,
        isCreating,
        toasts,
        updateField,
        addToast,
        dismissToast,
        addCharacter,
        updateCharacter,
        removeCharacter,
        goToStep,
        goNext,
        goBack,
        handleSubmit,
        WIZARD_STEPS,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useProject must be used within ProjectProvider");
  return ctx;
}
