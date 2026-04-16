"use client";

import React from "react";
import { motion } from "framer-motion";

export function PacingHeatmap({ arousal, visual }) {
  if (!arousal || !visual || arousal.length === 0) return null;

  // We combine arousal and visual for a "Total Attention" signal
  const combined = arousal.map((a, i) => ({
    t: a.t,
    v: (a.v + (visual[i]?.v || 0)) / 2
  }));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Temporal Attention</span>
        <span className="text-[9px] text-white/40">Engagement Heatmap</span>
      </div>
      
      <div className="relative h-2 w-full bg-white/5 rounded-full overflow-hidden flex">
        {combined.map((point, i) => (
          <div 
            key={i}
            className="h-full flex-1"
            style={{
              backgroundColor: getColorForValue(point.v),
              opacity: 0.8 + point.v * 0.2
            }}
            title={`Time: ${point.t}s | Intensity: ${Math.round(point.v * 100)}%`}
          />
        ))}
      </div>
      
      <div className="flex justify-between text-[8px] text-white/20 uppercase font-bold px-1">
        <span>Start</span>
        <span>End of Scene</span>
      </div>
    </div>
  );
}

function getColorForValue(v) {
  // Low (Cold) -> High (Hot)
  // Cyan -> Purple -> Pink
  if (v < 0.3) return "#06b6d4"; // Cyan
  if (v < 0.6) return "#ba9eff"; // Primary Purple
  return "#f472b6"; // Pink
}
