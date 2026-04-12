"use client";

import React, { useState } from "react";
import ComicWorkflow from "@/features/comic/components/comic-workflow";
import ContentIntegrityRail from "@/features/comic/components/content-integrity-rail";
import { useProjectData } from "@/hooks/useProjectData";

export default function ComicPage({ params }) {
  const unwrappedParams = React.use(params);
  const projectId = unwrappedParams?.projectId;
  
  const { projectData, isLoading } = useProjectData(projectId);
  
  const [currentStep, setCurrentStep] = useState(1);
  const [comicData, setComicData] = useState(null);

  // Steps: 1: SELECT TEMPLATE, 2: UPLOAD (Assemble), 3: ANALYZE (Generate), 4: EDIT, 5: EXPORT
  const STEPS = [
    "SELECT TEMPLATE",
    "UPLOAD",
    "ANALYZE",
    "EDIT",
    "EXPORT"
  ];

  const handleNext = () => {
    if (currentStep < 5) setCurrentStep(currentStep + 1);
  };

  const handlePrev = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#0e0e11] text-white overflow-hidden">
      {/* TOPBAR */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-white/5 bg-[#131316]/60 backdrop-blur shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-[#ba9eff]/20 flex items-center justify-center text-[#ba9eff]">
            {/* simple icon */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-wide">Nolan Formatter Pro</h1>
            <p className="text-[10px] text-white/50 tracking-widest uppercase">AI Comic Book</p>
          </div>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-6">
          {STEPS.map((stepName, idx) => {
            const stepNum = idx + 1;
            const isActive = currentStep === stepNum;
            const isCompleted = currentStep > stepNum;

            return (
              <div key={idx} className="flex items-center gap-2">
                <div 
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300
                    ${isCompleted ? 'bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 
                      isActive ? 'bg-[#ba9eff] text-black shadow-[0_0_15px_rgba(186,158,255,0.4)]' : 
                      'bg-white/5 text-white/40'}`}
                >
                  {isCompleted ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  ) : (
                    stepNum
                  )}
                </div>
                <span className={`text-[10px] font-bold tracking-widest uppercase transition-colors duration-300 ${isActive || isCompleted ? 'text-white' : 'text-white/30'}`}>
                  {stepName}
                </span>
              </div>
            );
          })}
        </div>

        <button className="text-white/50 hover:text-white transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <ContentIntegrityRail 
          currentStep={currentStep} 
          comicData={comicData}
          projectData={projectData}
          onGenerateRequest={() => setCurrentStep(2)}
        />

        {/* Dynamic Center Stage */}
        <div className="flex-1 relative overflow-y-auto overflow-x-hidden p-8 bg-[#09090b]">
          <ComicWorkflow 
            projectId={projectId}
            projectData={projectData}
            currentStep={currentStep}
            setStep={setCurrentStep}
            comicData={comicData}
            setComicData={setComicData}
          />
        </div>
      </div>
    </div>
  );
}
