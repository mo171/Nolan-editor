"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Sparkles, Loader2 } from "lucide-react";
import { useProject } from "@/features/project/context/project-context";

export function WizardProgress() {
  const { activeStep, WIZARD_STEPS, goBack, goNext, handleSubmit, submitStatus } = useProject();
  const isLast       = activeStep === WIZARD_STEPS.length - 1;
  const isSubmitting = submitStatus === "submitting";
  const progress     = ((activeStep + 1) / WIZARD_STEPS.length) * 100;

  return (
    <div className="flex-shrink-0 border-t border-white/5 bg-[#0e0e11]">
      {/* Progress track */}
      <div className="h-0.5 bg-white/5 w-full">
        <motion.div
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="h-full bg-gradient-to-r from-primary to-[#69daff] rounded-full"
        />
      </div>

      {/* Button row */}
      <div className="flex items-center justify-between px-8 py-4">
        {/* Step counter */}
        <span className="text-[11px] text-white/25 font-medium tabular-nums">
          Step {activeStep + 1} of {WIZARD_STEPS.length}
        </span>

        {/* Navigation */}
        <div className="flex items-center gap-3">
          {/* Back */}
          <AnimatePresence>
            {activeStep > 0 && (
              <motion.button
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.18 }}
                id="wizard-back-btn"
                onClick={goBack}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white/40 border border-white/8 hover:text-white/70 hover:border-white/20 hover:bg-white/4 disabled:opacity-30 transition-all duration-200"
              >
                <ArrowLeft size={14} />
                Back
              </motion.button>
            )}
          </AnimatePresence>

          {/* Next / Launch */}
          <motion.button
            layout
            id={isLast ? "wizard-launch-btn" : "wizard-next-btn"}
            onClick={isLast ? handleSubmit : goNext}
            disabled={isSubmitting}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed ${
              isLast
                ? "bg-gradient-to-r from-primary to-[#69daff] text-black hover:opacity-90 hover:scale-105 hover:shadow-[0_0_20px_rgba(186,158,255,0.4)] active:scale-95"
                : "bg-white/8 text-white/80 border border-white/10 hover:bg-white/12 hover:text-white hover:border-white/20"
            }`}
          >
            <AnimatePresence mode="wait">
              {isSubmitting ? (
                <motion.span
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2"
                >
                  <Loader2 size={14} className="animate-spin" />
                  Creating universe…
                </motion.span>
              ) : isLast ? (
                <motion.span
                  key="launch"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2"
                >
                  <Sparkles size={14} />
                  Launch Project
                </motion.span>
              ) : (
                <motion.span
                  key="next"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2"
                >
                  Next
                  <ArrowRight size={14} />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </div>
    </div>
  );
}
