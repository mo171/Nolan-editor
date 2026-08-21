"use client";

import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

const KPI_CONFIG = {
  arousal: { color: "#ba9eff", label: "Arousal" },  // Purple
  visual: { color: "#69daff", label: "Visual" },   // Blue
  semantic: { color: "#fbbf24", label: "Semantic" }, // Amber
  reward: { color: "#f472b6", label: "Reward" },    // Pink
};

export function NeuralPulseChart({ data, comparisonData, activeKpi = "arousal" }) {
  // Hooks must run before any early return. Previously this useMemo sat below
  // the "No Neural Data" guard, so the hook count changed the moment stats
  // arrived (empty -> populated) and React threw "rendered more hooks than
  // during the previous render", taking the whole dashboard down.
  const chartData = React.useMemo(() => {
    if (!data || data.length === 0) return [];
    if (!comparisonData) return data;
    // Map current data and attach comparison values at matching 't'
    return data.map((d, i) => ({
      ...d,
      cv: comparisonData[i]?.v || 0
    }));
  }, [data, comparisonData]);

  if (!data || data.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center border border-dashed border-white/10 rounded-xl bg-white/2">
        <span className="text-[10px] text-white/20 uppercase tracking-widest font-bold">No Neural Data</span>
      </div>
    );
  }

  // Fall back to arousal styling rather than crashing on an unmapped KPI key.
  const config = KPI_CONFIG[activeKpi] || KPI_CONFIG.arousal;

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={config.color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={config.color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
          <XAxis 
            dataKey="t" 
            hide 
          />
          <YAxis 
            domain={[0, 1]} 
            hide 
          />
          <Tooltip
            contentStyle={{ 
              backgroundColor: "#131316", 
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              fontSize: "10px"
            }}
            itemStyle={{ color: config.color }}
            labelFormatter={(t) => `${t}s`}
          />
          <Area
            type="monotone"
            dataKey="v"
            stroke={config.color}
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorValue)"
            animationDuration={1500}
          />
          {comparisonData && (
            <Area
              type="monotone"
              dataKey="cv"
              stroke="rgba(255,255,255,0.2)"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              fillOpacity={0.1}
              fill="rgba(255,255,255,0.05)"
              animationDuration={1500}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
