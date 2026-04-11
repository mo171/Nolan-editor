"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { ProjectProvider, useProject } from "@/features/project/context/project-context";
import { ToastStack } from "@/features/project/components/toast-stack";
import { ProjectSidebar } from "@/features/project/components/project-sidebar";
import { ProjectTopbar } from "@/features/project/components/project-topbar";
import { ProjectAssistant } from "@/features/project/components/project-assistant";
import { WizardTabs } from "@/features/project/components/wizard-tabs";
import { WizardProgress } from "@/features/project/components/wizard-progress";

import { StepBasicInfo } from "@/features/project/components/steps/step-basic-info";
import { StepWorldSetup } from "@/features/project/components/steps/step-world-setup";
import { StepTheCast } from "@/features/project/components/steps/step-the-cast";
import { StepConflict } from "@/features/project/components/steps/step-conflict";

// ─── Step Router ──────────────────────────────────────────────────────────────
function CurrentStep() {
  const { activeStep } = useProject();

  const variants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  };

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto py-8">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeStep}
          initial="initial"
          animate="animate"
          exit="exit"
          variants={variants}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="h-full"
        >
          {activeStep === 0 && <StepBasicInfo />}
          {activeStep === 1 && <StepWorldSetup />}
          {activeStep === 2 && <StepTheCast />}
          {activeStep === 3 && <StepConflict />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ─── Main Content Area ────────────────────────────────────────────────────────
function ProjectContent() {
  const { submitStatus, isUploading } = useProject();

  return (
    <div className="flex flex-col flex-1 h-full min-w-0 overflow-hidden bg-[#0a0a0c] relative">
      {/* Loading Overlays */}
      <AnimatePresence>
        {(submitStatus === "submitting" || isUploading) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-[#0e0e11]/90 backdrop-blur-md"
          >
            <div className="flex flex-col items-center p-8 rounded-2xl bg-[#131316] border border-white/10 shadow-[0_0_50px_rgba(186,158,255,0.15)]">
              <Loader2 className="animate-spin text-primary w-12 h-12 mb-4" />
              <h2 className="text-xl font-bold font-heading text-white mb-2">
                {isUploading ? "Embedding Narrative DNA..." : "Initializing Universe..."}
              </h2>
              <p className="text-sm text-white/50 text-center max-w-[280px]">
                {isUploading
                  ? "Our AI is processing your reference material. This may take a moment."
                  : "Weaving your parameters into a multi-dimensional story graph."}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Navigation */}
      <ProjectTopbar />

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Main Wizard Form */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Header area */}
          <div className="px-8 pt-8 pb-4 flex-shrink-0">
            <h1 className="text-3xl font-bold font-heading text-white mb-2">Initialize Narrative</h1>
            <p className="text-white/40 text-sm max-w-xl">
              Shape the foundation of your next universe. Our AI will weave these parameters into a multi-dimensional story graph.
            </p>
          </div>

          <div className="px-8 flex-shrink-0">
            <WizardTabs />
          </div>

          {/* Form Content - scrollable */}
          <div className="flex-1 overflow-y-auto px-8 scrollbar-thin">
            <CurrentStep />
          </div>

          {/* Sticky Progress Bar at bottom */}
          <WizardProgress />
        </div>

        {/* Right: AI Assistant */}
        <ProjectAssistant />
      </div>
    </div>
  );
}

// ─── Root Page ────────────────────────────────────────────────────────────────
export default function ProjectPage() {
  return (
    <ProjectProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-[#0e0e11] text-white font-sans">
        <ToastStack />
        <ProjectSidebar />
        <ProjectContent />
      </div>
    </ProjectProvider>
  );
}