"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Zap, Bot, ChevronRight, MessageSquare } from "lucide-react";
import { useProject } from "@/features/project/context/project-context";

const STEP_HINTS = [
  [
    { from: "ai", text: "Welcome, Creator. I see you're starting a **Cyberpunk** story. Would you like some suggestions for unique high-tech societal conflicts?" }
  ],
  [
    { from: "ai", text: "A strong premise in one sentence is worth a thousand pages of notes. What is your story *really* about at its core?" }
  ],
  [
    { from: "ai", text: "Great stories live and die by their characters. Even a brief description unlocks better arc suggestions from me." }
  ],
  [
    { from: "ai", text: "You're almost ready to launch! The conflict type helps me calibrate how tense my ghost-text suggestions should feel." }
  ],
];

// ─── Chat bubble ──────────────────────────────────────────────────────────────
function Bubble({ msg, index }) {
  const isAI = msg.from === "ai";
  const isUser = msg.from === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.08 }}
      className={`flex gap-3 mb-4 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {isAI && (
        <div className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0 mt-0.5 bg-gradient-to-br from-primary to-[#8b6ae5] shadow-[0_0_10px_rgba(186,158,255,0.4)]">
          <Zap size={12} className="text-white fill-white" />
        </div>
      )}
      <div
        className={`px-4 py-3 text-[12px] leading-relaxed shadow-sm ${
          isAI
            ? "bg-[#18181b] border border-white/5 text-white/80 rounded-2xl rounded-tl-sm w-[220px]"
            : "bg-[#271d3b] border border-primary/20 text-primary/90 rounded-2xl rounded-tr-sm max-w-[200px]"
        }`}
        dangerouslySetInnerHTML={{
          __html: msg.text.replace(/\*\*(.*?)\*\*/g, "<strong class='text-white'>$1</strong>").replace(/\*(.*?)\*/g, "<em>$1</em>"),
        }}
      />
    </motion.div>
  );
}

// ─── Project Assistant ────────────────────────────────────────────────────────
export function ProjectAssistant() {
  const { activeStep } = useProject();
  const [messages, setMessages] = useState(STEP_HINTS[0]);
  const [input, setInput] = useState("");
  const [isOpen, setIsOpen] = useState(true);
  
  const bottomRef = useRef(null);
  const prevStep = useRef(0);

  // Inject step-specific hints when tab changes
  useEffect(() => {
    if (prevStep.current !== activeStep) {
      if (activeStep === 0) {
        setMessages(STEP_HINTS[0]);
      } else {
        setMessages((prev) => [...prev, ...STEP_HINTS[activeStep]]);
      }
      prevStep.current = activeStep;
    }
  }, [activeStep]);

  // Auto-scroll
  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  function sendMessage() {
    const text = input.trim();
    if (!text) return;
    setMessages((prev) => [
      ...prev,
      { from: "user", text },
      {
        from: "ai",
        text: "Consider the 'Neurological Rent' concept: The elite live in cloud-synced utopias while the poor must rent processing power just to experience sensory colors. This creates a literal 'gray' underworld.",
      },
    ]);
    setInput("");
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  // If collapsed, render a floating trigger button
  if (!isOpen) {
    return (
      <div className="w-[80px] h-full flex flex-col items-center pt-8 flex-shrink-0 border-l border-white/5 bg-[#0e0e11]">
        <button
          onClick={() => setIsOpen(true)}
          className="w-12 h-12 rounded-2xl bg-[#15151a] border border-white/10 flex items-center justify-center hover:bg-white/5 hover:border-primary/30 transition-all shadow-xl group"
        >
          <div className="relative">
            <MessageSquare size={20} className="text-white/40 group-hover:text-primary transition-colors" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#15151a]" />
          </div>
        </button>
      </div>
    );
  }

  // Full Expanded Panel
  return (
    <aside className="w-[360px] flex-shrink-0 h-full p-6 flex flex-col border-l border-white/5 bg-[#0e0e11]">
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex flex-col h-full bg-[#15151a] rounded-2xl shadow-2xl border border-white/5 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5 bg-[#18181d] flex-shrink-0">
          <div className="w-7 h-7 rounded-lg bg-[#69daff]/15 flex items-center justify-center flex-shrink-0">
            <Bot size={14} className="text-[#69daff]" />
          </div>
          <span className="text-sm font-bold text-white/90 font-heading tracking-wide">Project Assistant</span>
          
          <div className="ml-auto flex items-center gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1 text-white/30 hover:text-white/70 hover:bg-white/5 rounded-md transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Message thread */}
        <div className="flex-1 overflow-y-auto px-5 py-6 scrollbar-thin">
          <AnimatePresence mode="popLayout">
            {messages.map((msg, i) => (
              <Bubble key={i} msg={msg} index={i} />
            ))}
          </AnimatePresence>
          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div className="flex-shrink-0 p-4 pt-2 bg-[#15151a]">
          <div className="flex items-center gap-2 px-4 py-3 bg-[#1a1a22] border border-white/5 rounded-xl focus-within:border-primary/40 focus-within:shadow-[0_0_0_3px_rgba(186,158,255,0.05)] transition-all">
            <input
              id="assistant-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask for suggestions..."
              className="flex-1 bg-transparent text-xs text-white/80 placeholder-white/20 outline-none"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim()}
              className="group flex items-center justify-center text-primary hover:text-[#d3c2ff] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </motion.div>
    </aside>
  );
}
