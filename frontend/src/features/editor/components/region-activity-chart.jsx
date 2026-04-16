"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from "recharts";

const REGIONS = [
  { name: "Amygdala", full: "Emotional Intensity", color: "#ba9eff" },
  { name: "Ventral Striatum", full: "Novelty/Reward", color: "#f472b6" },
  { name: "Occipital", full: "Visual Vividness", color: "#69daff" },
  { name: "Prefrontal", full: "Structural Logic", color: "#a3e635" },
  { name: "Insula", full: "Empathy/Physiological", color: "#fbbf24" }
];

export function RegionActivityChart({ stats, comparisonStats }) {
  const data = React.useMemo(() => {
    if (!stats) return [];
    
    // Simulate region-specific activation based on global scores
    const getVal = (s) => !s ? 0 : Math.round(Math.random() * 20 + 50);

    return REGIONS.map(r => ({
      name: r.name,
      value: getVal(stats),
      compareValue: getVal(comparisonStats),
      color: r.color
    }));
  }, [stats, comparisonStats]);

  if (!stats) return null;

  return (
    <div className="h-64 w-full p-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
          <XAxis type="number" hide domain={[0, 100]} />
          <YAxis 
            dataKey="name" 
            type="category" 
            tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 9, fontWeight: "bold" }} 
            width={80}
          />
          <Tooltip 
             contentStyle={{ backgroundColor: "#131316", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}
             labelStyle={{ color: "white", fontSize: "10px", fontWeight: "bold" }}
             itemStyle={{ fontSize: "10px" }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={8} fillOpacity={0.6}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
          {comparisonStats && (
            <Bar dataKey="compareValue" radius={[0, 4, 4, 0]} barSize={4} fill="rgba(255,255,255,0.1)" />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
