"use client";

import React from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";

export function NeuralRadarChart({ stats, comparisonStats }) {
  const data = React.useMemo(() => {
    if (!stats) return [];
    
    // Aggregate averages for each KPI
    const getAvg = (arr) => arr && arr.length > 0 
      ? arr.reduce((acc, curr) => acc + curr.v, 0) / arr.length 
      : 0;

    return [
      { 
        subject: "Arousal", 
        A: getAvg(stats.arousal_data) * 100, 
        B: getAvg(comparisonStats?.arousal_data) * 100 
      },
      { 
        subject: "Visual", 
        A: getAvg(stats.visual_data) * 100, 
        B: getAvg(comparisonStats?.visual_data) * 100 
      },
      { 
        subject: "Semantic", 
        A: getAvg(stats.semantic_data) * 100, 
        B: getAvg(comparisonStats?.semantic_data) * 100 
      },
      { 
        subject: "Reward", 
        A: (stats.hook_score || 0) * 100, 
        B: (comparisonStats?.hook_score || 0) * 100 
      },
      { subject: "Clarity", A: 85, B: 80 }, 
    ];
  }, [stats, comparisonStats]);

  if (!stats) return null;

  return (
    <div className="h-64 w-full flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="rgba(255,255,255,0.05)" />
          <PolarAngleAxis 
            dataKey="subject" 
            tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10, fontWeight: "bold" }} 
          />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            name="Main Scene"
            dataKey="A"
            stroke="#ba9eff"
            fill="#ba9eff"
            fillOpacity={0.4}
          />
          {comparisonStats && (
            <Radar
              name="Benchmark"
              dataKey="B"
              stroke="rgba(255,255,255,0.3)"
              fill="rgba(255,255,255,0.1)"
              fillOpacity={0.2}
            />
          )}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
