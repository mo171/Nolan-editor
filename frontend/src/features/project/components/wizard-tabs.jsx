"use client";

import React from "react";
import { motion } from "framer-motion";
import { useProject } from "@/features/project/context/project-context";

export function WizardTabs() {
  const { activeStep, goToStep, WIZARD_STEPS } = useProject();

  return (
    <div className="flex items-end gap-0 border-b border-white/5">
      {WIZARD_STEPS.map((step) => {
        const isActive = activeStep === step.id;
        const isDone   = activeStep > step.id;

        return (
          <button
            key={step.id}
            id={`wizard-tab-${step.id}`}
            onClick={() => goToStep(step.id)}
            className={`relative px-6 py-3 text-xs font-bold tracking-widest uppercase transition-all duration-200 ${
              isActive
                ? "text-white"
                : isDone
                ? "text-white/50 hover:text-white/70"
                : "text-white/25 hover:text-white/50"
            }`}
          >
            {/* Numbered label */}
            <span className="flex items-center gap-2">
              <span
                className={`text-[10px] font-black ${
                  isActive ? "text-primary" : isDone ? "text-primary/50" : "text-white/20"
                }`}
              >
                {step.code}.
              </span>
              {step.label}
            </span>

            {/* Active underline */}
            {isActive && (
              <motion.div
                layoutId="wizard-underline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full"
                transition={{ duration: 0.25, ease: "easeInOut" }}
              />
            )}

            {/* Done dot */}
            {isDone && (
              <span className="absolute top-2.5 right-3 w-1.5 h-1.5 rounded-full bg-primary/60" />
            )}
          </button>
        );
      })}
    </div>
  );
}
