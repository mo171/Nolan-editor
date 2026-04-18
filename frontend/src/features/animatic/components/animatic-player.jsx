"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  Pause, 
  Play, 
  SkipForward, 
  SkipBack, 
  Volume2, 
  VolumeX,
  Maximize2
} from "lucide-react";

export function AnimaticPlayer({ data, onClose }) {
  const [currentPanelIndex, setCurrentPanelIndex] = useState(0);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  const bgMusicRef = useRef(null);
  const segmentAudioRef = useRef(null);

  const panels = data?.panels || [];
  const currentPanel = panels[currentPanelIndex];
  const currentSegment = currentPanel?.segments[currentSegmentIndex];

  // Initialize background music
  useEffect(() => {
    if (data.background_music) {
      bgMusicRef.current = new Audio(data.background_music);
      bgMusicRef.current.loop = true;
      bgMusicRef.current.volume = 0.2; // Low ambient
      if (isPlaying) bgMusicRef.current.play().catch(e => console.error("BG music error", e));
    }
    
    return () => {
      if (bgMusicRef.current) {
        bgMusicRef.current.pause();
        bgMusicRef.current = null;
      }
    };
  }, [data.background_music]);

  // Handle segment playback
  useEffect(() => {
    if (!currentSegment || !isPlaying || isFinished) return;

    const audio = new Audio(currentSegment.audio_url);
    segmentAudioRef.current = audio;

    const handleEnded = () => {
      if (currentSegmentIndex < currentPanel.segments.length - 1) {
        setCurrentSegmentIndex(prev => prev + 1);
      } else if (currentPanelIndex < panels.length - 1) {
        setCurrentPanelIndex(prev => prev + 1);
        setCurrentSegmentIndex(0);
      } else {
        setIsFinished(true);
      }
    };

    // Safety check for browser support/loading
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(e => {
        console.warn("[Animatic] Audio playback suppressed or source not found:", e);
        // If audio fails, we still want to show the caption for a brief period then move on
        const fallbackTimer = setTimeout(() => {
          handleEnded();
        }, 3000); // 3-second silence fallback
        return () => clearTimeout(fallbackTimer);
      });
    }

    segmentAudioRef.current.addEventListener("ended", handleEnded);
    
    // Pre-load next image if available
    if (currentPanelIndex < panels.length - 1) {
      const nextImg = new Image();
      nextImg.src = panels[currentPanelIndex + 1].image_url;
    }

    return () => {
      if (segmentAudioRef.current) {
        segmentAudioRef.current.pause();
        segmentAudioRef.current.removeEventListener("ended", handleEnded);
        segmentAudioRef.current = null;
      }
    };
  }, [currentPanelIndex, currentSegmentIndex, isPlaying, isFinished]);

  // Handle Mute
  useEffect(() => {
    if (bgMusicRef.current) bgMusicRef.current.muted = isMuted;
    if (segmentAudioRef.current) segmentAudioRef.current.muted = isMuted;
  }, [isMuted]);

  // Ken Burns Animation Variants
  const kenBurnsBgVariants = {
    initial: { scale: 1.1, x: 0, y: 0 },
    animate: {
      scale: [1.1, 1.25, 1.15],
      x: [0, -15, 10],
      y: [0, 8, -5],
      transition: {
        duration: 25,
        repeat: Infinity,
        repeatType: "reverse",
        ease: "easeInOut"
      }
    }
  };

  const kenBurnsFgVariants = {
    initial: { scale: 1 },
    animate: {
      scale: [1, 1.08, 1.04],
      transition: {
        duration: 30,
        repeat: Infinity,
        repeatType: "reverse",
        ease: "easeInOut"
      }
    }
  };

  const handleTogglePlay = () => {
    setIsPlaying(!isPlaying);
    if (isPlaying) {
      bgMusicRef.current?.pause();
      segmentAudioRef.current?.pause();
    } else {
      bgMusicRef.current?.play();
      segmentAudioRef.current?.play();
    }
  };

  if (!data) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-[#050507] flex flex-col overflow-hidden text-white"
    >
      {/* Top Bar */}
      <div className="absolute top-0 inset-x-0 h-20 bg-gradient-to-b from-black/80 to-transparent z-10 p-6 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-4 pointer-events-auto">
          <div className="bg-primary/20 border border-primary/30 p-2 rounded-lg">
             <Film size={18} className="text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest text-white/90">Animatic Playback</h2>
            <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">
              Mood: {data.metadata?.mood} • Scene {currentPanelIndex + 1} of {panels.length}
            </p>
          </div>
        </div>
        
        <button 
          onClick={onClose}
          className="pointer-events-auto p-2 rounded-full bg-white/5 hover:bg-white/10 transition-all text-white/40 hover:text-white"
        >
          <X size={20} />
        </button>
      </div>

      {/* Main Slide Area */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-black">
        <AnimatePresence mode="wait">
          {currentPanel && (
            <motion.div 
              key={`${currentPanel.scene_id}_${currentPanelIndex}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
              className="relative w-full h-full flex items-center justify-center overflow-hidden"
              style={{ aspectRatio: "16/9" }}
            >
              {/* Blurred Background Layer (Depth) */}
              <motion.div 
                className="absolute inset-0 z-0 origin-center"
                variants={kenBurnsBgVariants}
                initial="initial"
                animate="animate"
              >
                <img 
                  src={currentPanel.image_url}
                  className="w-full h-full object-cover blur-3xl opacity-40 scale-125"
                />
              </motion.div>

              {/* Main Cinematic Shot (Widescreen) */}
              <motion.img 
                variants={kenBurnsFgVariants}
                initial="initial"
                animate="animate"
                src={currentPanel.image_url}
                className="relative z-10 w-full h-full object-contain shadow-2xl origin-center"
              />
              
              {/* Cinematic Vignette */}
              <div className="absolute inset-0 z-20 bg-gradient-to-t from-black/90 via-transparent to-black/80 pointer-events-none" />
              <div className="absolute inset-0 z-20 shadow-[inset_0_0_150px_rgba(0,0,0,0.7)] pointer-events-none" />

              {/* Captions / Dialogue Layer */}
              <div className="absolute inset-x-8 bottom-36 z-30 flex flex-col items-center justify-end text-center gap-6 pb-4">
                 {currentSegment?.type === "narration" && (
                   <motion.div 
                     initial={{ y: 20, opacity: 0 }}
                     animate={{ y: 0, opacity: 1 }}
                     key={currentSegment.id}
                     className="max-w-4xl bg-black/50 backdrop-blur-xl border border-white/10 p-5 rounded-2xl shadow-2xl"
                   >
                     <p className="text-lg md:text-xl font-serif text-white/90 italic leading-relaxed tracking-wide">
                        "{currentSegment.text}"
                     </p>
                   </motion.div>
                 )}

                 {currentSegment?.type === "dialogue" && (
                   <motion.div 
                      initial={{ scale: 0.9, y: 15, opacity: 0 }}
                      animate={{ scale: 1, y: 0, opacity: 1 }}
                      key={currentSegment.id}
                      className="bg-white/95 backdrop-blur-md px-8 py-5 rounded-3xl relative shadow-2xl border-4 border-black/10"
                   >
                      <div className="text-black/50 font-black text-[11px] uppercase tracking-widest mb-2 flex items-center justify-center gap-3">
                        <div className="w-6 h-[1px] bg-black/20" />
                        {currentSegment.speaker}
                        <div className="w-6 h-[1px] bg-black/20" />
                      </div>
                      <div className="text-black text-2xl md:text-3xl font-bold leading-snug max-w-2xl px-4">
                        {currentSegment.text}
                      </div>
                      {/* Stylized Bubble tail */}
                      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-white/95 rotate-45 border-r-4 border-b-4 border-black/10" />
                   </motion.div>
                 )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Finished Screen */}
        <AnimatePresence>
          {isFinished && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 z-20 bg-black/90 flex flex-col items-center justify-center text-center p-10"
            >
               <h3 className="text-4xl font-black uppercase tracking-tighter mb-4 text-primary">The End</h3>
               <p className="text-white/40 mb-8 max-w-md uppercase tracking-widest text-[11px] font-bold">
                 You've completed the animatic sequence for this chapter.
               </p>
               <div className="flex gap-4">
                 <button 
                   onClick={() => {
                     setCurrentPanelIndex(0);
                     setCurrentSegmentIndex(0);
                     setIsFinished(false);
                     setIsPlaying(true);
                   }}
                   className="px-8 py-3 rounded-full bg-white text-black font-bold text-sm hover:bg-white/80 transition-all"
                 >
                   Replay Experience
                 </button>
                 <button 
                   onClick={onClose}
                   className="px-8 py-3 rounded-full bg-white/10 text-white font-bold text-sm border border-white/10 hover:bg-white/20 transition-all"
                 >
                   Return to Studio
                 </button>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Controls */}
      <div className="h-32 bg-gradient-to-t from-black to-transparent p-8 flex items-center justify-between z-10">
        <div className="flex items-center gap-6">
          <button 
             onClick={() => {
                if (currentPanelIndex > 0) {
                  setCurrentPanelIndex(prev => prev - 1);
                  setCurrentSegmentIndex(0);
                }
             }}
             className="text-white/40 hover:text-white transition-all disabled:opacity-20"
             disabled={currentPanelIndex === 0}
          >
            <SkipBack size={24} fill="currentColor" />
          </button>

          <button 
            onClick={handleTogglePlay}
            className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/30 hover:scale-110 active:scale-95 transition-all"
          >
            {isPlaying ? <Pause size={32} fill="white" /> : <Play size={32} fill="white" className="ml-1" />}
          </button>

          <button 
             onClick={() => {
                if (currentPanelIndex < panels.length - 1) {
                  setCurrentPanelIndex(prev => prev + 1);
                  setCurrentSegmentIndex(0);
                } else {
                  setIsFinished(true);
                }
             }}
             className="text-white/40 hover:text-white transition-all"
          >
            <SkipForward size={24} fill="currentColor" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="flex-1 max-w-xl mx-12 hidden md:block">
           <div className="flex justify-between text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">
             <span>Scene {currentPanelIndex + 1}</span>
             <span>Total Progress: {Math.round((currentPanelIndex / panels.length) * 100)}%</span>
           </div>
           <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div 
                animate={{ width: `${((currentPanelIndex + 1) / panels.length) * 100}%` }}
                className="h-full bg-primary" 
              />
           </div>
        </div>

        <div className="flex items-center gap-4">
           <button onClick={() => setIsMuted(!isMuted)} className="text-white/40 hover:text-white transition-all">
             {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
           </button>
           <button className="text-white/40 hover:text-white transition-all">
             <Maximize2 size={20} />
           </button>
        </div>
      </div>
    </motion.div>
  );
}

// Sub-icons for internal use
function Film({ size, className }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
      <line x1="7" y1="2" x2="7" y2="22" />
      <line x1="17" y1="2" x2="17" y2="22" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <line x1="2" y1="7" x2="7" y2="7" />
      <line x1="2" y1="17" x2="7" y2="17" />
      <line x1="17" y1="17" x2="22" y2="17" />
      <line x1="17" y1="7" x2="22" y2="7" />
    </svg>
  );
}
