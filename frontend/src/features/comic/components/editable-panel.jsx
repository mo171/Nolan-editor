"use client";

import { useState, useRef, useEffect } from "react";
import { RefreshCw, Wand2, X, Loader2, Sparkles, ImageIcon } from "lucide-react";

// ─── Regenerate Modal ─────────────────────────────────────────────────────────

function RegenerateModal({ panelIndex, onConfirm, onClose, isLoading }) {
  const [prompt, setPrompt] = useState("");
  const textareaRef = useRef(null);

  // Focus textarea on open
  useEffect(() => {
    setTimeout(() => textareaRef.current?.focus(), 80);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const suggestions = [
    "Make the scene more dramatic at night",
    "Add a stormy sky with lightning",
    "Change the mood to mysterious and foggy",
    "Make it look like a retro 1980s comic",
    "Add more detail to the background city",
  ];

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Card */}
      <div
        className="relative w-full max-w-lg rounded-2xl overflow-hidden shadow-[0_0_80px_rgba(186,158,255,0.25)]"
        style={{ background: "linear-gradient(135deg,#131316 0%,#1a1a22 100%)", border: "1px solid rgba(186,158,255,0.18)" }}
      >
        {/* Purple accent bar */}
        <div className="h-1 w-full" style={{ background: "linear-gradient(90deg,#ba9eff,#69daff)" }} />

        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Wand2 size={18} className="text-[#ba9eff]" />
              <h3 className="text-white font-bold text-lg tracking-tight">Regenerate Scene {panelIndex + 1}</h3>
            </div>
            <p className="text-white/40 text-sm">Describe what you want changed — the AI will repaint the panel.</p>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Prompt textarea */}
        <div className="px-6 pb-4">
          <div className="relative rounded-xl overflow-hidden" style={{ border: "1px solid rgba(186,158,255,0.25)" }}>
            <div className="absolute top-3 left-3 text-[#ba9eff]/60 pointer-events-none">
              <ImageIcon size={16} />
            </div>
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isLoading}
              placeholder="E.g. A hero standing on a rooftop at dusk, city lights below, dramatic silhouette…"
              rows={4}
              className="w-full pl-9 pr-4 pt-3 pb-3 bg-transparent text-white text-sm resize-none outline-none placeholder:text-white/25 disabled:opacity-50"
              style={{ caretColor: "#ba9eff" }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && !isLoading) {
                  e.preventDefault();
                  onConfirm(prompt.trim());
                }
              }}
            />
          </div>

          {/* Quick suggestions */}
          <div className="mt-3">
            <p className="text-white/30 text-xs mb-2 uppercase tracking-widest">Quick ideas</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => setPrompt(s)}
                  disabled={isLoading}
                  className="text-xs px-3 py-1.5 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-all border border-white/10 hover:border-[#ba9eff]/40 disabled:opacity-40"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 pb-6 flex items-center justify-between gap-3">
          <p className="text-white/25 text-xs">Leave blank to regenerate with original context</p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white/60 hover:text-white hover:bg-white/5 border border-white/10 transition-all disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(prompt.trim())}
              disabled={isLoading}
              className="px-5 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: isLoading ? "rgba(186,158,255,0.3)" : "linear-gradient(135deg,#ba9eff,#8b5cf6)",
                color: "#fff",
                boxShadow: isLoading ? "none" : "0 0 20px rgba(186,158,255,0.35)",
              }}
            >
              {isLoading ? (
                <><Loader2 size={15} className="animate-spin" /> Generating…</>
              ) : (
                <><Sparkles size={15} /> Regenerate</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main EditablePanel ───────────────────────────────────────────────────────

export default function EditablePanel({ panelData, onUpdate, index, projectId }) {
  const [showModal, setShowModal] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  if (!panelData) return null;

  const handleTopTextChange    = (e) => onUpdate({ ...panelData, topText: e.target.value });
  const handleBottomTextChange = (e) => onUpdate({ ...panelData, bottomText: e.target.value });

  const handleRegenerate = async (customPrompt) => {
    setIsRegenerating(true);
    try {
      const panelId = panelData.id || "local";
      const pid     = projectId || "unknown";

      const res = await fetch(
        `http://localhost:8000/projects/${pid}/comics/panels/${panelId}/regenerate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            custom_prompt: customPrompt || null,
            panel_context: {
              scene_text:  panelData.topText + " " + panelData.bottomText,
              key_action:  panelData.topText,
            },
          }),
        }
      );

      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();

      if (data?.image_url) {
        // Cache-bust the URL so the browser fetches the new image
        onUpdate({ ...panelData, imageUrl: data.image_url + `?t=${Date.now()}` });
      }
    } catch (err) {
      console.error("[EditablePanel] Regenerate failed:", err);
    } finally {
      setIsRegenerating(false);
      setShowModal(false);
    }
  };

  return (
    <>
      {/* ── Regenerate modal (portal-style, rendered above the layout) ── */}
      {showModal && (
        <RegenerateModal
          panelIndex={index}
          onConfirm={handleRegenerate}
          onClose={() => !isRegenerating && setShowModal(false)}
          isLoading={isRegenerating}
        />
      )}

      {/* ── Panel card ── */}
      <div
        id={`comic-panel-${index}`}
        className="w-full max-w-[800px] bg-white rounded-lg flex flex-col p-8 text-black shadow-2xl relative border-4 border-black transition-transform duration-300 hover:scale-[1.01]"
      >
        {/* Top Banner Text */}
        <div className="w-full bg-[#fdfdd0] border-4 border-black p-4 text-center font-bold font-sans uppercase mb-6 shadow-[4px_4px_0_0_rgba(0,0,0,1)] relative group">
          <textarea
            value={panelData.topText}
            onChange={handleTopTextChange}
            className="w-full bg-transparent border-none outline-none resize-none text-center font-bold focus:bg-yellow-100/50"
            rows={2}
          />
          <div className="absolute -top-3 -right-3 w-6 h-6 bg-black text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </div>
        </div>

        {/* Main Image Container */}
        <div className="relative w-full aspect-[16/9] border-4 border-black mb-6 bg-gray-200 group overflow-hidden shadow-[4px_4px_0_0_rgba(0,0,0,1)]">

          {/* Actual image */}
          <img
            src={panelData.imageUrl}
            alt="Comic Panel"
            className={`w-full h-full object-cover transition-opacity duration-500 ${isRegenerating ? "opacity-20" : "opacity-100"}`}
          />

          {/* Generating spinner overlay (shown while fetching new image) */}
          {isRegenerating && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/40 backdrop-blur-sm">
              <div className="relative w-14 h-14">
                <div className="absolute inset-0 border-4 border-white/10 rounded-full" />
                <div className="absolute inset-0 border-4 border-[#ba9eff] rounded-full border-t-transparent animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Wand2 size={20} className="text-[#ba9eff] animate-pulse" />
                </div>
              </div>
              <p className="text-white font-bold text-sm tracking-widest uppercase">Generating…</p>
            </div>
          )}

          {/* Hover Regenerate Overlay (hidden while generating) */}
          {!isRegenerating && (
            <div
              className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer backdrop-blur-sm"
              onClick={() => setShowModal(true)}
            >
              <div className="px-6 py-3 bg-white text-black font-bold flex items-center gap-2 rounded hover:scale-105 active:scale-95 transition-all select-none">
                <RefreshCw size={18} />
                REGENERATE IMAGE
              </div>
            </div>
          )}

          {/* Speech Bubbles */}
          {panelData.bubbles &&
            panelData.bubbles.map((bubble, idx) => (
              <div
                key={idx}
                className="absolute bg-white border-[3px] border-black px-5 py-3 rounded-[24px] font-bold text-xs uppercase text-center shadow-[3px_3px_0_0_rgba(0,0,0,1)] cursor-move hover:bg-gray-100 min-w-[80px] max-w-[180px] leading-tight flex items-center justify-center break-words"
                style={{
                  top: `${bubble.y}%`,
                  left: `${bubble.x}%`,
                  transform: "translate(-50%, -50%)",
                  zIndex: 10 + idx,
                }}
              >
                {bubble.text}
                <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[12px] border-t-black" />
                <div className="absolute -bottom-[7px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[10px] border-t-white" />
              </div>
            ))}
        </div>

        {/* Bottom Banner Text */}
        <div className="w-[80%] mx-auto bg-white border-4 border-black p-4 text-center font-bold font-sans rounded-[40px] uppercase shadow-[4px_4px_0_0_rgba(0,0,0,1)] group relative">
          <textarea
            value={panelData.bottomText}
            onChange={handleBottomTextChange}
            className="w-full bg-transparent border-none outline-none resize-none text-center font-bold focus:bg-gray-100/50"
            rows={3}
          />
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-black text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </div>
        </div>
      </div>
    </>
  );
}
