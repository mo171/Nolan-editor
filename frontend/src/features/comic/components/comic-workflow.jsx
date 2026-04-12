"use client";

import { useState, useEffect } from "react";
import EditablePanel from "./editable-panel";
import { Loader2, LayoutPanelLeft, LayoutTemplate, Search, Wand2 } from "lucide-react";

export default function ComicWorkflow({ projectId, projectData, currentStep, setStep, comicData, setComicData }) {
  const [selectedTemplate, setSelectedTemplate] = useState("single_panel");
  const [isGenerating, setIsGenerating] = useState(false);

  // Generate Comic via Backend API
  useEffect(() => {
    if (currentStep === 2) {
      // Progress to Step 3 visually right away to show "Analyzing"
      const t = setTimeout(() => setStep(3), 1000);
      return () => clearTimeout(t);
    } else if (currentStep === 3 && !isGenerating) {
      const executePipeline = async () => {
        setIsGenerating(true);
        try {
          const res = await fetch(`http://localhost:8000/projects/${projectId}/comics/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chapter_id: projectData?.chapters?.[0]?.id || "preview_chapter", 
              template_id: selectedTemplate
            })
          });
          const data = await res.json();
          
          if (data?.comic?.pages?.[0]?.panels?.[0]) {
             const serverPanel = data.comic.pages[0].panels[0];
             setComicData({
                title: data.comic.title || "Generated Comic",
                panel: {
                  imageUrl: serverPanel.image_url,
                  topText: serverPanel.caption_top || "...",
                  bottomText: serverPanel.caption_bottom || "...",
                  bubbles: serverPanel.speech_bubbles || []
                }
             });
          } else {
             // Fallback
             setComicData(getMockComicData());
          }
        } catch (e) {
          console.error("Failed to generate comic:", e);
          setComicData(getMockComicData());
        } finally {
          setIsGenerating(false);
          setStep(4);
        }
      };
      
      executePipeline();
    }
  }, [currentStep, setStep, setComicData, projectId, selectedTemplate, isGenerating]);

  const getMockComicData = () => ({
    title: "Generation Fallback",
    panel: {
      imageUrl: "https://placehold.co/800x600/1e1e24/ff6b6b?text=API+Error:+Generation+Failed",
      topText: "An error occurred while generating your comic. Please check your backend logs or your OpenAI API key.",
      bottomText: "The system has gracefully fallen back so the editor does not crash.",
      bubbles: []
    }
  });

  // --- VIEWS ---

  if (currentStep === 1) {
    return (
      <div className="h-full flex flex-col pt-4">
        <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
          <LayoutTemplate className="text-[#ba9eff]" />
          Choose Layout Template
        </h2>
        
        <div className="grid grid-cols-3 gap-6">
          <div 
            onClick={() => setSelectedTemplate("single_panel")}
            className={`cursor-pointer rounded-2xl border-2 transition-all duration-300 overflow-hidden bg-[#131316] hover:-translate-y-2 hover:shadow-[0_10px_30px_rgba(186,158,255,0.15)]
              ${selectedTemplate === "single_panel" ? 'border-[#ba9eff]' : 'border-white/5 hover:border-white/20'}`}
          >
            <div className="aspect-[4/5] bg-[#0e0e11] p-6 flex flex-col gap-4">
              <div className="w-full h-8 bg-white/10 rounded" />
              <div className="w-full flex-1 bg-white/20 rounded border border-dashed border-white/30 flex items-center justify-center">
                <LayoutPanelLeft size={32} className="text-white/30" />
              </div>
              <div className="w-full h-16 bg-white/10 rounded" />
            </div>
            <div className="p-4 bg-white/5 border-t border-white/5">
              <h3 className="font-bold text-sm">Classic Single</h3>
              <p className="text-xs text-white/50 mt-1">Epic splash page with contextual top/bottom narration.</p>
            </div>
          </div>

          <div 
            onClick={() => setSelectedTemplate("split_panel")}
            className={`cursor-pointer rounded-2xl border-2 transition-all duration-300 overflow-hidden bg-[#131316] hover:-translate-y-2 hover:shadow-[0_10px_30px_rgba(186,158,255,0.15)]
              ${selectedTemplate === "split_panel" ? 'border-[#ba9eff]' : 'border-white/5 hover:border-white/20'}`}
          >
            <div className="aspect-[4/5] bg-[#0e0e11] p-6 flex flex-col gap-4">
              <div className="w-full flex-1 bg-white/20 rounded border border-dashed border-white/30" />
              <div className="w-full flex-1 bg-white/20 rounded border border-dashed border-white/30" />
            </div>
            <div className="p-4 bg-white/5 border-t border-white/5">
              <h3 className="font-bold text-sm">Action Split</h3>
              <p className="text-xs text-white/50 mt-1">Two panels stacked. Great for dialogue exchanges.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === 2 || currentStep === 3) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <div className="relative w-32 h-32 mb-8">
          <div className="absolute inset-0 border-4 border-[#131316] rounded-full"></div>
          <div className="absolute inset-0 border-4 border-[#ba9eff] rounded-full border-t-transparent animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            {currentStep === 2 ? <Search className="text-[#ba9eff] animate-pulse" size={32} /> : <Wand2 className="text-[#69daff] animate-bounce" size={32} />}
          </div>
        </div>
        
        <h2 className="text-2xl font-bold tracking-wide">
          {currentStep === 2 ? 'Uploading & Structuring Scenes...' : 'Analyzing & Generating Image...'}
        </h2>
        <p className="text-white/50 mt-2 text-center max-w-md">
          {currentStep === 2 
            ? 'We are converting your raw text into detailed NLP structural components.' 
            : 'Applying cinematic layout rules and prompting Stable Diffusion models. Please wait.'}
        </p>
      </div>
    );
  }

  if (currentStep === 4 && comicData) {
    return (
      <div className="h-full flex flex-col items-center overflow-y-auto pb-20">
        <EditablePanel 
          panelData={comicData.panel} 
          onUpdate={(updatedData) => setComicData({...comicData, panel: updatedData})} 
        />
        
        <div className="mt-12 flex gap-4">
           <button 
             onClick={() => setStep(5)}
             className="px-8 py-3 bg-white text-black font-bold rounded-full hover:scale-105 active:scale-95 transition-all shadow-[0_4px_20px_rgba(255,255,255,0.2)]"
           >
             Looks Good → Continue to Export
           </button>
        </div>
      </div>
    );
  }

  if (currentStep === 5) {
     return (
       <div className="h-full flex flex-col items-center justify-center">
         <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-500 mb-6 shadow-[0_0_50px_rgba(16,185,129,0.3)]">
           <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
         </div>
         <h2 className="text-3xl font-bold mb-4">Comic Generated Successfully!</h2>
         <p className="text-white/50 text-center max-w-lg mb-8">
           Your comic page is ready for distribution. You can generate a high-res PDF or export the raw images to integrate into your wider project.
         </p>
         
         {/* NOTE: Left-bar "GENERATE PDF" button matches the mockup */}
         <div className="animate-pulse text-sm text-[#ba9eff] font-bold tracking-widest uppercase">
           Click "GENERATE PDF" on the left rail to finalise.
         </div>
       </div>
     )
  }

  return null;
}
