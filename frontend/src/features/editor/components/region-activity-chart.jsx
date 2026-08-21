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

// Each region is scored from the KPI series it actually drives. The mapping
// mirrors backend/services/analytics/roi_definitions.py::get_kpi_mapping():
//   arousal  = insula (cortical) + amygdala (subcortical)
//   visual   = occipital
//   semantic = prefrontal
//   reward   = ventral_striatum
const REGIONS = [
  { name: "Amygdala", full: "Emotional Intensity", color: "#ba9eff", kpi: "arousal" },
  { name: "Ventral Striatum", full: "Novelty/Reward", color: "#f472b6", kpi: "reward" },
  { name: "Occipital", full: "Visual Vividness", color: "#69daff", kpi: "visual" },
  { name: "Prefrontal", full: "Structural Logic", color: "#a3e635", kpi: "semantic" },
  { name: "Insula", full: "Empathy/Physiological", color: "#fbbf24", kpi: "arousal" }
];

/** Mean of a `[{ t, v }]` KPI series, expressed as a 0-100 activation score. */
function activationScore(stats, kpi) {
  const series = stats?.[`${kpi}_data`];
  if (!Array.isArray(series) || series.length === 0) return 0;
  const total = series.reduce((acc, point) => acc + (Number(point?.v) || 0), 0);
  // Series values are 0-1 predictions; clamp because the simulated generator
  // adds gaussian noise that can push a sample slightly outside the range.
  return Math.max(0, Math.min(100, Math.round((total / series.length) * 100)));
}

export function RegionActivityChart({ stats, comparisonStats }) {
  const data = React.useMemo(() => {
    if (!stats) return [];

    // Derived from the real per-timestep predictions returned by
    // /api/analytics/scene/{id}. This previously returned Math.random(), which
    // both rendered impure output during render and presented invented numbers
    // as neural analysis.
    return REGIONS.map(r => ({
      name: r.name,
      value: activationScore(stats, r.kpi),
      compareValue: activationScore(comparisonStats, r.kpi),
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
