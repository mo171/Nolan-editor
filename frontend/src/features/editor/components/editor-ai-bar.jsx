"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Wand2,
  ArrowUp,
  Mic,
  PenLine,
  Zap,
} from "lucide-react";
import { useEditorContext } from "@/features/editor/context/editor-context";

const QUICK_PROMPTS = [
  { label: "Continue story", icon: PenLine },
  { label: "Fix consistency", icon: Wand2 },
  { label: "Add dialogue", icon: Zap },
];

export function EditorAiBar() {
  const [value, setValue] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const inputRef = useRef(null);
  const { activeScene } = useEditorContext();

  return (
    <div className="flex-shrink-0 bg-[#0e0e11] border-t border-white/5">
      <div className="max-w-3xl mx-auto px-6 py-2.5">
        {/* Quick Prompts */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 mb-2 overflow-hidden"
            >
              {QUICK_PROMPTS.map(({ label, icon: Icon }) => (
                <button
                  key={label}
                  onClick={() => setValue(label + "...")}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary/80 text-xs font-medium hover:bg-primary/20 transition-colors"
                >
                  <Icon size={11} />
                  {label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Row */}
        <div className="flex items-center gap-2 bg-[#131316]/80 border border-white/8 rounded-xl px-3 py-2 focus-within:border-primary/30 transition-colors">
          <Sparkles size={15} className="text-primary/50 flex-shrink-0" />
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setIsExpanded(true)}
            onBlur={() => !value && setIsExpanded(false)}
            placeholder="Add Magic to below with AI…"
            className="flex-1 bg-transparent text-sm text-white/70 placeholder:text-white/25 outline-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && value.trim()) {
                // TODO: Wire to AI backend
                console.log("[AI Prompt]:", value);
                setValue("");
                setIsExpanded(false);
              }
            }}
          />
          <div className="flex items-center gap-1.5">
            <button className="p-1.5 rounded-lg hover:bg-white/5 text-white/25 hover:text-white/50 transition-all">
              <Mic size={13} />
            </button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              disabled={!value.trim()}
              onClick={() => {
                if (value.trim()) {
                  console.log("[AI Prompt]:", value);
                  setValue("");
                  setIsExpanded(false);
                }
              }}
              className={`p-1.5 rounded-lg transition-all ${
                value.trim()
                  ? "bg-primary/20 text-primary hover:bg-primary/30"
                  : "text-white/15 cursor-not-allowed"
              }`}
            >
              <ArrowUp size={13} />
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}
