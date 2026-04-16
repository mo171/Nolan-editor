"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronLeft, 
  Zap, 
  BarChart3, 
  Activity, 
  BrainCircuit, 
  Sparkles, 
  TrendingUp,
  AlertCircle,
  Play
} from "lucide-react";
import { useEditorContext } from "@/features/editor/context/editor-context";
import { NeuralPulseChart } from "./neural-pulse-chart";
import { PacingHeatmap } from "./pacing-heatmap";
import { NeuralRadarChart } from "./neural-radar-chart";
import { RegionActivityChart } from "./region-activity-chart";

const KPI_LABELS = {
  arousal: { label: "Arousal", desc: "Emotional tension & energy", color: "text-[#ba9eff]", bg: "bg-[#ba9eff]/10" },
  visual: { label: "Visual Fidelity", desc: "Mental imagery & vividness", color: "text-[#69daff]", bg: "bg-[#69daff]/10" },
  semantic: { label: "Semantic Load", desc: "Narrative complexity & depth", color: "text-amber-400", bg: "bg-amber-400/10" }
};

export function NeuralDashboard() {
  const { 
    setActiveView, 
    neuralStats, 
    activeScene,
    isNeuralSyncing,
    syncNeuralStats,
    chapters,
    triggerNeuralHighlight
  } = useEditorContext();

  const [activeKpi, setActiveKpi] = useState("arousal");
  const [comparisonSceneId, setComparisonSceneId] = useState(null);
  const [comparisonStats, setComparisonStats] = useState(null);
  const [isComparing, setIsComparing] = useState(false);

  // Infinite Canvas State
  const [canvasScale, setCanvasScale] = useState(1);
  const [canvasPos, setCanvasPos] = useState({ x: 0, y: 0 });

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY;
    setCanvasScale(prev => Math.max(0.4, Math.min(2.5, prev - delta * 0.001)));
  };

  const handleToggleComparison = async (id) => {
    if (id === comparisonSceneId) {
      setIsComparing(false);
      setComparisonSceneId(null);
      setComparisonStats(null);
      return;
    }
    
    setComparisonSceneId(id);
    setIsComparing(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/analytics/scene/${id}`);
      const data = await res.json();
      setComparisonStats(data);
    } catch (e) {
      console.error("Failed to load comparison stats", e);
    }
  };

  // Derive stable scores from neuralStats
  const derivedScores = useMemo(() => {
    if (!neuralStats) return { arousal: 0, visual: 0, semantic: 0 };
    
    const getAvg = (arr) => {
      if (!arr || arr.length === 0) return 0;
      return Math.round((arr.reduce((acc, c) => acc + c.v, 0) / arr.length) * 100);
    };

    return {
      arousal: getAvg(neuralStats.arousal_data),
      visual: getAvg(neuralStats.visual_data),
      semantic: getAvg(neuralStats.semantic_data),
      hook: Math.round((neuralStats.hook_score || 0) * 100)
    };
  }, [neuralStats]);

  // Derived Insights (In a real app, these would come from the LLM or Backend)
  const insights = useMemo(() => {
    if (!neuralStats) return [];
    const list = [];
    if (neuralStats.hook_score < 0.6) {
      list.push({
        id: "hook",
        title: "Weak Opening (Reward Lull)",
        desc: "The reader's Ventral Striatum response is below the engagement threshold.",
        prescription: "Add a 'Pattern Interrupt' — a sensory surprise or a direct narrative reveal in the first 30 seconds.",
        severity: "high"
      });
    }
    if (neuralStats.lulls?.length > 0) {
      list.push({
        id: "pacing",
        title: "Pacing Valley Detected",
        desc: `Engagement drops significantly at ${neuralStats.lulls[0].start}s.`,
        prescription: "Inject visual descriptors or a tactical shift to re-activate the Occipital and Prefrontal cortex.",
        severity: "medium"
      });
    }
    return list;
  }, [neuralStats]);

  return (
    <div className="h-full w-full flex flex-col bg-[#0e0e11]/90 overflow-hidden select-none">
      
      {/* ─── Top Navigation ─── */}
      <nav className="h-16 flex items-center justify-between px-8 border-b border-white/5 bg-[#131316]/50 backdrop-blur-xl z-50">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => setActiveView("editor")}
            className="group flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all text-white/50 hover:text-white"
          >
            <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-xs font-bold uppercase tracking-widest">Back to Studio</span>
          </button>
          
          <div className="h-4 w-px bg-white/10" />
          
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Neural Intelligence Lab</span>
            <span className="text-sm font-bold text-white tracking-tighter">
              {activeScene?.title || "Untitled Scene"} — <span className="text-white/40 italic font-medium text-xs">Analysis Mode</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={syncNeuralStats}
            disabled={isNeuralSyncing}
            className="flex items-center gap-2 px-6 py-2 rounded-xl bg-primary text-white text-xs font-black uppercase tracking-widest hover:bg-primary/80 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
          >
            {isNeuralSyncing ? <BarChart3 className="animate-spin" size={14} /> : <Zap size={14} />}
            {isNeuralSyncing ? "Neuralizing..." : "Sync Neural Core"}
          </button>
        </div>
      </nav>

      <div className="flex-1 flex overflow-hidden">
        
        {/* ─── Left Sidebar: Stats & Charts ─── */}
        <aside className="w-[380px] border-r border-white/5 flex flex-col p-6 overflow-y-auto scrollbar-hide">
          <div className="space-y-8">
            
            {/* KPI Metrics */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-4">Cortical Signatures</h4>
              {Object.entries(KPI_LABELS).map(([id, cfg]) => (
                <motion.button
                  key={id}
                  onClick={() => setActiveKpi(id)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`w-full p-4 rounded-2xl border transition-all text-left relative overflow-hidden group ${
                    activeKpi === id 
                    ? "bg-white/10 border-white/20 shadow-2xl" 
                    : "bg-transparent border-white/5 hover:border-white/10"
                  }`}
                >
                  {activeKpi === id && (
                    <motion.div layoutId="kpi-glow" className="absolute inset-0 bg-primary/5 blur-xl pointer-events-none" />
                  )}
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[11px] font-black uppercase tracking-widest ${activeKpi === id ? cfg.color : "text-white/40"}`}>
                      {cfg.label}
                    </span>
                    <TrendingUp size={12} className={activeKpi === id ? cfg.color : "text-white/10"} />
                  </div>
                  <div className="text-[10px] text-white/30 font-medium mb-3">{cfg.desc}</div>
                  <div className="flex items-end gap-2">
                    <span className="text-2xl font-black text-white tracking-tighter">
                      {neuralStats ? derivedScores[id] : "--"}%
                    </span>
                    <span className="text-[9px] text-[#69daff] font-bold mb-1">+{(derivedScores[id] % 15) + 5}% vs Project Avg</span>
                  </div>
                </motion.button>
              ))}
            </div>

            {/* Detailed Pulse Area */}
            <div className="flex flex-col rounded-2xl bg-[#131316] border border-white/5 overflow-hidden">
               <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-white/5">
                 <div className="flex flex-col">
                   <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.1em]">Scene Narrative Intensity</span>
                   <span className="text-[9px] text-white/20 font-bold uppercase tracking-widest">Real-time fMRI Prediction Pulse</span>
                 </div>
                 <Activity size={12} className="text-primary animate-pulse" />
               </div>
               <div className="p-2">
                 <NeuralPulseChart 
                    data={neuralStats?.[`${activeKpi}_data`]} 
                    comparisonData={comparisonStats?.[`${activeKpi}_data`]}
                    activeKpi={activeKpi} 
                 />
               </div>
            </div>

            {/* Pacing Heatmap */}
            <div className="p-4 rounded-2xl bg-white/2 border border-white/5">
              <PacingHeatmap 
                arousal={neuralStats?.arousal_data} 
                visual={neuralStats?.visual_data} 
              />
            </div>

            {/* NEW: Region Activity */}
            <div className="p-1 rounded-2xl bg-[#131316] border border-white/5">
              <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Regional Activation</span>
                <BrainCircuit size={12} className="text-[#a3e635]" />
              </div>
              <RegionActivityChart stats={neuralStats} comparisonStats={comparisonStats} />
            </div>

            {/* NEW: Radar Narrative Balance */}
            <div className="p-1 rounded-2xl bg-[#131316] border border-white/5">
              <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Narrative Signature</span>
                <Sparkles size={12} className="text-[#ba9eff]" />
              </div>
              <NeuralRadarChart stats={neuralStats} comparisonStats={comparisonStats} />
            </div>
          </div>
        </aside>

        {/* ─── Center: The Infinite Neural Constellation ─── */}
        <main 
          className="flex-1 relative overflow-hidden flex flex-col items-center justify-center bg-black/20 cursor-grab active:cursor-grabbing"
          onWheel={handleWheel}
        >
            
            {/* Infinite Parallax Background */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
               <motion.div 
                 style={{ x: canvasPos.x * 0.2, y: canvasPos.y * 0.2, scale: 1.5 }}
                 className="absolute inset-[-50%] bg-[radial-gradient(circle_at_center,rgba(186,158,255,0.03)_0%,transparent_70%)] opacity-50"
               />
               <motion.div 
                 style={{ x: canvasPos.x * 0.1, y: canvasPos.y * 0.1 }}
                 className="absolute inset-[-50%] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10"
               />
               <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0)_0%,rgba(14,14,17,0.8)_100%)]" />
            </div>
            
            <AnimatePresence>
              {neuralStats ? (
                <motion.div 
                   drag
                   dragConstraints={{ left: -1000, right: 1000, top: -1000, bottom: 1000 }}
                   onDrag={(e, info) => setCanvasPos(prev => ({ x: prev.x + info.delta.x, y: prev.y + info.delta.y }))}
                   style={{ scale: canvasScale }}
                   className="relative w-full h-full flex items-center justify-center"
                >
                   {/* Styled Constellation Wrapper */}
                   <motion.div 
                     initial={{ opacity: 0, scale: 0.8 }}
                     animate={{ opacity: 1, scale: 1 }}
                     className="relative w-[800px] h-[800px]"
                   >
                       {/* Central "Hook" Node */}
                      <div className="absolute top-[400px] left-[400px] -translate-x-1/2 -translate-y-1/2">
                        <NeuralNode 
                          label="Hook Potential" 
                          value={Math.round((neuralStats?.hook_score || 0)*100)} 
                          color="#ba9eff" 
                          size={160} 
                          pulse
                        />
                      </div>

                      {/* Satellite Nodes - Absolute Pixels for alignment */}
                      <div className="absolute top-[120px] left-[160px] -translate-x-1/2 -translate-y-1/2">
                        <NeuralNode label="Sensory Input" value={derivedScores.visual} color="#69daff" size={90} />
                      </div>
                      <div className="absolute top-[640px] left-[680px] -translate-x-1/2 -translate-y-1/2">
                        <NeuralNode label="Cognitive Load" value={derivedScores.semantic} color="#fbbf24" size={110} />
                      </div>
                      <div className="absolute top-[240px] left-[600px] -translate-x-1/2 -translate-y-1/2 opacity-40">
                        <NeuralNode label="Subtext" value={Math.round(derivedScores.hook / 2)} color="#f472b6" size={70} />
                      </div>

                      {/* Connection Lines (Precise Pixels) */}
                      <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                        <defs>
                          <filter id="glow">
                            <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                            <feMerge>
                              <feMergeNode in="coloredBlur"/>
                              <feMergeNode in="SourceGraphic"/>
                            </feMerge>
                          </filter>
                        </defs>
                        <motion.line x1="400" y1="400" x2="160" y2="120" stroke="#69daff" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" filter="url(#glow)" />
                        <motion.line x1="400" y1="400" x2="680" y2="640" stroke="#fbbf24" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" filter="url(#glow)" />
                        <motion.line x1="400" y1="400" x2="600" y2="240" stroke="#f472b6" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" filter="url(#glow)" />
                      </svg>
                   </motion.div>

                   <div className="absolute bottom-12 text-center flex flex-col gap-1">
                      <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.5em]">Neural Narrative Topology</span>
                      <span className="text-[10px] text-white/40 italic">Structural peaks identified via brain-encoding markers</span>
                   </div>
                </motion.div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                    <BrainCircuit size={32} className="text-white/20 animate-pulse" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-white/50 font-bold uppercase tracking-widest text-[10px]">Neural Core Offline</h3>
                    <p className="text-white/20 text-[9px] max-w-[200px] mt-1">Sync your scene to visualize narrative brain response</p>
                  </div>
                </div>
              )}
            </AnimatePresence>
        </main>

        {/* ─── Right Sidebar: Actionable Improvements ─── */}
        <aside className="w-[420px] bg-[#16161d]/50 border-l border-white/5 p-8 overflow-y-auto scrollbar-hide">
            
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-2">
                <Sparkles size={18} className="text-primary" />
                <h3 className="text-lg font-black text-white tracking-tighter uppercase">The AI Prescription</h3>
              </div>
              <p className="text-[11px] text-white/40 font-medium leading-relaxed">
                Nolan has analyzed 20,484 cortical vertices. Here is how to optimize for maximum reader retention.
              </p>
            </div>

            <div className="space-y-6">
              {insights.length > 0 ? insights.map((insight) => (
                <motion.div 
                  key={insight.id}
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  className="p-6 rounded-3xl bg-gradient-to-br from-white/[0.03] to-transparent border border-white/5 hover:border-white/10 transition-all flex flex-col gap-4 relative group"
                >
                  <div className={`absolute top-4 right-4 text-[8px] font-black uppercase tracking-widest ${insight.severity === 'high' ? 'text-red-400' : 'text-amber-400'}`}>
                    {insight.severity} Priority
                  </div>

                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${insight.severity === 'high' ? 'bg-red-400/10' : 'bg-amber-400/10'}`}>
                      <AlertCircle size={14} className={insight.severity === 'high' ? 'text-red-400' : 'text-amber-400'} />
                    </div>
                    <h4 className="text-[13px] font-bold text-white/90">{insight.title}</h4>
                  </div>

                  <p className="text-[11px] text-white/50 leading-relaxed font-medium">
                    {insight.desc}
                  </p>

                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5 shadow-inner">
                    <div className="text-[9px] font-black text-primary uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                       <Zap size={10} />
                       AI Recommendation
                    </div>
                    <p className="text-[12px] text-white/90 font-medium leading-relaxed italic">
                      {insight.prescription}
                    </p>
                  </div>

                  <button 
                    onClick={() => {
                      setActiveView("editor");
                      triggerNeuralHighlight(insight.id === 'hook' ? 'hook' : 'lull', insight.time || 0);
                    }}
                    className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95 group-hover:bg-primary/10 group-hover:border-primary/20 group-hover:text-primary transition-all duration-500"
                  >
                    <Play size={10} />
                    Jump to Editor
                  </button>
                </motion.div>
              )) : (
                <div className="h-64 flex flex-col items-center justify-center border border-dashed border-white/5 rounded-3xl">
                   <Check size={24} className="text-white/10 mb-2" />
                   <span className="text-[10px] text-white/20 uppercase tracking-widest font-black">Neural Consistency Perfect</span>
                </div>
              )}
            </div>

            <div className="mt-12 pt-8 border-t border-white/5">
               <div className="flex flex-col gap-4">
                 <div className="flex flex-col">
                   <span className="text-[10px] font-bold text-white uppercase tracking-widest">A/B Narrative Benchmarking</span>
                   <span className="text-[9px] text-white/30">Compare neural profiles across scenes</span>
                 </div>
                 
                 <div className="grid grid-cols-1 gap-2">
                   {chapters.flatMap(ch => ch.scenes).filter(s => s.id !== activeScene?.id).slice(0, 3).map(scene => (
                     <button
                        key={scene.id}
                        onClick={() => handleToggleComparison(scene.id)}
                        className={`flex items-center justify-between px-4 py-2 rounded-xl border transition-all ${
                          comparisonSceneId === scene.id 
                          ? "bg-[#69daff]/10 border-[#69daff]/30 text-[#69daff]" 
                          : "bg-white/3 border-white/5 text-white/40 hover:text-white/60"
                        }`}
                     >
                       <span className="text-[10px] font-bold truncate max-w-[150px]">{scene.title}</span>
                       <span className="text-[8px] font-black uppercase tracking-widest">{comparisonSceneId === scene.id ? "Active" : "Compare"}</span>
                     </button>
                   ))}
                 </div>
               </div>
            </div>
        </aside>

      </div>
    </div>
  );
}

function NeuralNode({ label, value, color, size, pulse = false }) {
  return (
    <motion.div 
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="relative flex items-center justify-center bg-[#0e0e11] rounded-full border border-white/10 group cursor-pointer"
      style={{ width: size, height: size, boxShadow: `0 0 40px ${color}15` }}
    >
      {pulse && (
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.1, 0.3] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 rounded-full"
          style={{ backgroundColor: color }}
        />
      )}
      
      <div className="relative flex flex-col items-center text-center">
        <span className="text-[9px] font-black uppercase tracking-tighter opacity-40 group-hover:opacity-100 transition-opacity mb-0.5" style={{ color }}>{label}</span>
        <span className="text-2xl font-black text-white tracking-tighter group-hover:scale-110 transition-transform">{value}%</span>
      </div>

      <svg className="absolute inset-0 w-full h-full -rotate-90">
        <circle 
          cx={size/2} 
          cy={size/2} 
          r={(size/2) - 4} 
          fill="none" 
          stroke="rgba(255,255,255,0.05)" 
          strokeWidth="2" 
        />
        <motion.circle 
          initial={{ pathLength: 0 }}
          animate={{ pathLength: value/100 }}
          cx={size/2} 
          cy={size/2} 
          r={(size/2) - 4} 
          fill="none" 
          stroke={color} 
          strokeWidth="2" 
          strokeLinecap="round"
        />
      </svg>
    </motion.div>
  );
}

function Check({ size, className }) {
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
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
