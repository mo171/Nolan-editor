"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import {
  Sparkles,
  ArrowUpRight,
  PlayCircle,
  FileText,
  Wand2,
  Check,
  PenTool,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const phrases = [
  "Structured Storytelling.",
  "Deep Universe Lore.",
  "Cinematic Generation.",
  "Branching Narratives."
];

const useTypewriter = (phrases, typingSpeed = 80, deletingSpeed = 40, pauseTime = 1500) => {
  const [text, setText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [loopNum, setLoopNum] = useState(0);

  useEffect(() => {
    let timer;
    const currentPhrase = phrases[loopNum % phrases.length];

    if (isDeleting) {
      if (text === "") {
        setIsDeleting(false);
        setLoopNum((prev) => prev + 1);
      } else {
        timer = setTimeout(() => setText(currentPhrase.substring(0, text.length - 1)), deletingSpeed);
      }
    } else {
      if (text === currentPhrase) {
        timer = setTimeout(() => setIsDeleting(true), pauseTime);
      } else {
        timer = setTimeout(() => setText(currentPhrase.substring(0, text.length + 1)), typingSpeed);
      }
    }
    return () => clearTimeout(timer);
  }, [text, isDeleting, loopNum, phrases, typingSpeed, deletingSpeed, pauseTime]);

  return text;
};

const ConstellationGrid = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-40 flex items-center justify-center">
    <motion.div 
      animate={{ rotate: 360 }}
      transition={{ duration: 250, repeat: Infinity, ease: "linear" }}
      className="w-[200vw] h-[200vh]"
    >
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="constellation" x="0" y="0" width="300" height="300" patternUnits="userSpaceOnUse">
            <circle cx="40" cy="40" r="1.5" fill="rgba(186,158,255,0.4)" />
            <circle cx="200" cy="120" r="1.5" fill="rgba(105,218,255,0.4)" />
            <circle cx="120" cy="240" r="1.5" fill="rgba(255,255,255,0.3)" />
            <line x1="40" y1="40" x2="200" y2="120" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
            <line x1="200" y1="120" x2="120" y2="240" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
            <line x1="120" y1="240" x2="40" y2="40" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#constellation)" />
      </svg>
    </motion.div>
  </div>
);

export function HeroSection() {
  const containerRef = useRef(null);
  const typedText = useTypewriter(phrases);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  const blob1Y = useTransform(scrollYProgress, [0, 1], [0, 300]);
  const blob2Y = useTransform(scrollYProgress, [0, 1], [0, -200]);

  return (
    <section ref={containerRef} className="relative min-h-[921px] flex flex-col items-center justify-center px-6 overflow-hidden pt-16">
      <div className="absolute inset-0 z-0">
        <ConstellationGrid />
        <motion.div style={{ y: blob1Y }} className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px]"></motion.div>
        <motion.div style={{ y: blob2Y }} className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-[#69daff]/10 rounded-full blur-[150px]"></motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 max-w-5xl mx-auto text-center"
      >
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 mb-8">
          <Sparkles className="text-primary" size={18} />
          <span className="text-xs font-sans uppercase tracking-widest text-[#ae8dff]">
            The Future of Narrative
          </span>
        </div>

        <h1 className="font-heading text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight text-foreground relative flex flex-col py-4">
          <span>AI Studio for</span>
          <span className="relative mt-2 text-center w-full min-h-[1.2em]">
            <span className="bg-gradient-to-r from-primary to-[#69daff] bg-clip-text text-transparent">
              {typedText}
            </span>
            <motion.span
              animate={{ opacity: [1, 0, 1] }}
              transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
              className="inline-block w-[4px] h-[0.9em] bg-[#69daff] ml-1 translate-y-1"
            />
          </span>
        </h1>

        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed font-sans">
          Transform abstract ideas into immersive cinematic universes. Bridge
          the gap from raw concept to visual masterpieces using AI-orchestrated
          narrative graphs.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button className="h-14 px-8 rounded-full bg-gradient-to-r from-primary to-[#69daff] text-black font-bold text-lg shadow-[0_0_20px_rgba(186,158,255,0.3)] hover:shadow-[0_0_40px_rgba(186,158,255,0.5)] hover:-translate-y-1 hover:scale-105 active:scale-95 transition-all duration-300 flex items-center gap-2 border-none">
            Start Writing
            <ArrowUpRight size={20} />
          </Button>
          <Button
            variant="outline"
            className="h-14 px-8 rounded-full border-white/20 bg-white/10 hover:bg-white/20 hover:text-white hover:-translate-y-1 hover:scale-105 active:scale-95 transition-all duration-300 font-semibold flex items-center gap-2 text-lg shadow-xl backdrop-blur-sm"
          >
            <PlayCircle size={20} />
            View Demo
          </Button>
        </div>
      </motion.div>

      {/* Floating Preview Element */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
        className="mt-20 w-full max-w-7xl mx-auto px-6 perspective-1000 relative z-10"
      >
        <div className="relative rounded-2xl p-px bg-gradient-to-b from-white/20 to-transparent shadow-[0_30px_100px_-15px_rgba(0,0,0,1)] h-[500px] md:h-[650px] lg:h-[750px]">
          <div className="h-full w-full rounded-2xl overflow-hidden bg-[#0e0e11] border border-white/5 shadow-2xl flex flex-col relative text-left">
            {/* Fake macOS / Browser Top Bar */}
            <div className="h-12 border-b border-white/5 flex items-center px-4 justify-between bg-[#131316]">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground font-sans">
                <span className="flex items-center gap-1.5">
                  <FileText size={14} /> Chapter_01_Draft.md
                </span>
              </div>
              <div className="w-10"></div>
            </div>

            {/* Main Studio Area */}
            <div className="flex flex-1 overflow-hidden">
              {/* Fake Sidebar */}
              <div className="w-48 md:w-64 border-r border-white/5 bg-[#131316]/50 p-4 hidden sm:flex flex-col gap-4">
                <div className="text-xs font-bold text-muted-foreground tracking-wider uppercase mb-2">
                  Explorer
                </div>
                <div className="flex items-center gap-2 text-sm text-primary bg-primary/10 px-2 py-1.5 rounded-md cursor-pointer">
                  <FileText size={16} /> Chapter 01
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground hover:text-white px-2 py-1.5 cursor-pointer transition-colors">
                  <FileText size={16} /> Chapter 02
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground hover:text-white px-2 py-1.5 cursor-pointer transition-colors">
                  <FileText size={16} /> Characters
                </div>

                <div className="text-xs font-bold text-muted-foreground tracking-wider uppercase mt-6 mb-2">
                  Graph Overview
                </div>
                <div className="h-32 rounded-lg border border-white/5 bg-[#0e0e11] flex items-center justify-center relative overflow-hidden">
                  {/* Fake Mini Graph */}
                  <div className="absolute w-2 h-2 bg-primary rounded-full top-6 left-6 shadow-[0_0_10px_#ba9eff]"></div>
                  <div className="absolute w-2 h-2 bg-[#69daff] rounded-full bottom-6 right-8 shadow-[0_0_10px_#69daff]"></div>
                  <div className="absolute w-2 h-2 bg-white/50 rounded-full top-10 right-10"></div>
                  <svg
                    className="absolute inset-0 w-full h-full opacity-30"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    fill="none"
                  >
                    <path
                      d="M 32 32 C 50 60, 80 40, 120 80"
                      className="text-primary"
                    />
                    <path
                      d="M 120 80 C 140 100, 150 50, 160 50"
                      className="text-[#69daff]"
                    />
                  </svg>
                </div>
              </div>

              {/* Fake Editor Canvas */}
              <div className="flex-1 p-6 md:p-12 relative bg-[#0e0e11] overflow-hidden">
                <div className="max-w-2xl mx-auto h-full pr-4 text-left">
                  <h1 className="text-3xl md:text-4xl font-heading font-bold text-white mb-6">
                    The Awakening
                  </h1>
                  <p className="text-muted-foreground font-sans text-lg md:text-xl mb-4 leading-relaxed">
                    The neon glow of the syntheta-lamps flickered across
                    Kaelen's visor. He had been waiting in the shadows of the
                    lower district for exactly three cycles.
                  </p>

                  <div className="relative z-10 w-full">
                    <p className="text-muted-foreground font-sans text-lg md:text-xl mb-4 leading-relaxed">
                      <span className="border-b-2 border-dashed border-red-500/60 pb-0.5 hover:bg-red-500/10 transition-colors cursor-pointer text-white">
                        His breath misted the cold air
                      </span>{" "}
                      as he checked the coordinates one last time. They were
                      wrong.
                    </p>

                    {/* Suggestion Popover Glass */}
                    <motion.div
                      initial={{ opacity: 0, y: 15, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: 1.5, duration: 0.4 }}
                      className="absolute left-8 sm:left-20 top-14 w-72 sm:w-80 rounded-xl bg-[#25252a]/80 backdrop-blur-xl border border-primary/30 shadow-[0_10px_40px_rgba(0,0,0,0.5)] p-4 z-20 flex flex-col gap-3"
                    >
                      <div className="flex items-center gap-2 text-primary font-heading font-semibold text-sm">
                        <Wand2 size={16} /> Lore Inconsistency detected
                      </div>
                      <p className="text-sm font-sans text-white/90 leading-relaxed">
                        <span className="line-through text-red-400 opacity-80 mr-1">
                          "His breath misted the cold air"
                        </span>
                        contradicts earlier established universe lore. Class-4
                        helmets have internal temperature regulation and zero
                        external exhaust.
                      </p>
                      <div className="flex gap-2 mt-2">
                        <button className="flex-1 rounded-md bg-primary/20 hover:bg-primary/30 text-primary text-xs font-bold py-2 transition-colors">
                          Auto-Fix Scene
                        </button>
                        <button className="flex items-center justify-center w-8 rounded-md bg-white/5 hover:bg-white/10 text-white transition-colors">
                          <Check size={14} />
                        </button>
                      </div>
                    </motion.div>
                  </div>

                  <p className="text-muted-foreground font-sans text-lg md:text-xl leading-relaxed blur-[2px] opacity-40 mt-12 md:mt-24 pointer-events-none select-none">
                    The extraction point was supposed to be a secure relay
                    station, not an abandoned factory. If the syndicate had
                    tracked him here, the entire timeline would fracture. He
                    gripped his plasma-caster tighter, adjusting the frequency
                    dial to a lethal setting.
                  </p>
                </div>

                {/* Floating Action Menu in Editor */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 2, duration: 0.5 }}
                  className="absolute bottom-8 left-1/2 -translate-x-1/2 rounded-full bg-[#131316] border border-white/10 px-6 py-3 flex items-center gap-6 shadow-2xl z-30"
                >
                  <div
                    className="hover:bg-white/10 p-2 rounded-full text-muted-foreground hover:text-white cursor-pointer transition-colors"
                    title="Write"
                  >
                    <PenTool size={20} />
                  </div>
                  <div
                    className="bg-primary/20 p-2 rounded-full text-primary cursor-pointer transition-colors flex items-center justify-center shadow-[0_0_15px_rgba(186,158,255,0.2)]"
                    title="AI Assist"
                  >
                    <Sparkles size={20} fill="currentColor" />
                  </div>
                  <div
                    className="hover:bg-white/10 p-2 rounded-full text-muted-foreground hover:text-white cursor-pointer transition-colors"
                    title="Comments"
                  >
                    <MessageSquare size={20} />
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Subtle blend to pure black for the next section */}
      <div className="absolute bottom-0 left-0 w-full h-32 md:h-64 bg-gradient-to-t from-black via-black/80 to-transparent z-40 pointer-events-none mix-blend-normal"></div>
    </section>
  );
}
