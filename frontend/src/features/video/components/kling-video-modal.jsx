"use client";

import React, { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  RotateCcw,
  Clapperboard,
  Sparkles,
  AlertTriangle,
  Download,
  Music,
} from "lucide-react";

// ─── Loading Stage Config ─────────────────────────────────────────────────────

const LOADING_STAGES = [
  { id: "scenes",  label: "Loading comic panels",           pct: 10 },
  { id: "prompt",  label: "Synthesising narration script",  pct: 25 },
  { id: "submit",  label: "Downloading panel images",       pct: 45 },
  { id: "render",  label: "Applying Ken Burns effects",     pct: 65 },
  { id: "compose", label: "Encoding cinematic MP4",         pct: 85 },
  { id: "done",    label: "Video ready",                    pct: 100 },
];

// ─── Generating Overlay ───────────────────────────────────────────────────────

function GeneratingOverlay({ stage }) {
  const idx     = Math.max(0, LOADING_STAGES.findIndex((s) => s.id === stage));
  const current = LOADING_STAGES[idx];

  return (
    <div className="flex flex-col items-center justify-center h-full px-8 py-12 text-center select-none">
      {/* Pulsing icon */}
      <div className="relative mb-10">
        <div className="absolute inset-0 bg-[#ba9eff]/20 rounded-full blur-3xl scale-150 animate-pulse" />
        <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-[#ba9eff]/20 to-[#69daff]/10 border border-[#ba9eff]/30 flex items-center justify-center shadow-[0_0_60px_rgba(186,158,255,0.25)]">
          <Clapperboard size={40} className="text-[#ba9eff] drop-shadow-lg" />
          {/* Orbiting dot */}
          <motion.div
            className="absolute w-3 h-3 rounded-full bg-[#69daff] shadow-[0_0_10px_rgba(105,218,255,0.8)]"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            style={{ transformOrigin: "50px 50px" }}
          />
        </div>
      </div>

      <h2 className="text-2xl font-black tracking-tight text-white mb-2 uppercase">
        Building Your Cinematic Video
      </h2>
      <p className="text-white/40 text-xs uppercase tracking-widest font-bold mb-10 max-w-xs leading-relaxed">
        Stitching comic panels with Ken Burns effects and AI narration
      </p>

      {/* Progress bar */}
      <div className="w-full max-w-md">
        <div className="flex justify-between text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">
          <span>{current?.label ?? "Processing..."}</span>
          <span>{current?.pct ?? 0}%</span>
        </div>
        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-[#ba9eff] to-[#69daff]"
            animate={{ width: `${current?.pct ?? 0}%` }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
          />
        </div>
      </div>

      {/* Stage pills */}
      <div className="flex gap-2 flex-wrap justify-center mt-8">
        {LOADING_STAGES.slice(0, -1).map((s, i) => {
          const done   = i < idx;
          const active = i === idx;
          return (
            <div
              key={s.id}
              className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border transition-all duration-500 ${
                done
                  ? "bg-[#ba9eff]/15 border-[#ba9eff]/30 text-[#ba9eff]"
                  : active
                  ? "bg-white/10 border-white/20 text-white animate-pulse"
                  : "bg-transparent border-white/5 text-white/20"
              }`}
            >
              {s.label}
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-white/15 mt-8 uppercase tracking-widest">
        This may take 30–120 seconds. Please keep this window open.
      </p>
    </div>
  );
}

// ─── Video Player ─────────────────────────────────────────────────────────────

function VideoPlayer({ videoUrl, audioUrl, prompt }) {
  const videoRef  = useRef(null);
  const audioRef  = useRef(null);

  const [playing,     setPlaying]     = useState(false);
  const [muted,       setMuted]       = useState(false);
  const [progress,    setProgress]    = useState(0);
  const [showPrompt,  setShowPrompt]  = useState(false);
  const [audioActive, setAudioActive] = useState(!!audioUrl);

  // Sync audio with video
  useEffect(() => {
    const vid = videoRef.current;
    const aud = audioRef.current;
    if (!vid) return;

    const onTime = () => {
      setProgress((vid.currentTime / (vid.duration || 1)) * 100);
      // Keep backup audio in sync
      if (aud && audioActive && Math.abs(aud.currentTime - vid.currentTime) > 0.3) {
        aud.currentTime = vid.currentTime;
      }
    };
    const onPlay  = () => { setPlaying(true);  aud && audioActive && aud.play().catch(() => {}); };
    const onPause = () => { setPlaying(false); aud && aud.pause(); };
    const onEnded = () => { setPlaying(false); aud && aud.pause(); };

    vid.addEventListener("timeupdate", onTime);
    vid.addEventListener("play",       onPlay);
    vid.addEventListener("pause",      onPause);
    vid.addEventListener("ended",      onEnded);

    // Autoplay muted to avoid browser policy blocks; audio overlay handles narration
    vid.muted = true;
    vid.play().catch(() => {});

    return () => {
      vid.removeEventListener("timeupdate", onTime);
      vid.removeEventListener("play",       onPlay);
      vid.removeEventListener("pause",      onPause);
      vid.removeEventListener("ended",      onEnded);
    };
  }, [videoUrl, audioUrl, audioActive]);

  const togglePlay = () => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.paused ? vid.play() : vid.pause();
  };

  const handleSeek = (e) => {
    const vid  = videoRef.current;
    const aud  = audioRef.current;
    if (!vid) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct  = (e.clientX - rect.left) / rect.width;
    vid.currentTime = pct * vid.duration;
    if (aud) aud.currentTime = vid.currentTime;
  };

  // When mute is toggled — controls the audio track (video stays muted always)
  const handleMuteToggle = () => {
    const aud = audioRef.current;
    if (aud) {
      aud.muted = !muted;
      if (!muted) aud.pause(); else if (playing) aud.play().catch(() => {});
    }
    setMuted(!muted);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Video viewport */}
      <div className="relative flex-1 bg-black flex items-center justify-center group overflow-hidden">
        <div className="absolute inset-0 bg-gradient-radial from-[#ba9eff]/5 to-transparent pointer-events-none" />

        <video
          ref={videoRef}
          src={videoUrl}
          muted                   /* always muted — audio comes from audioRef */
          loop
          playsInline
          className="max-h-full max-w-full object-contain z-10"
        />

        {/* Hidden audio track (backup narration) */}
        {audioUrl && (
          <audio ref={audioRef} src={audioUrl} preload="auto" loop />
        )}

        {/* Click to play/pause */}
        <button
          onClick={togglePlay}
          className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Toggle play"
        >
          <div className="w-20 h-20 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-2xl">
            {playing
              ? <Pause size={32} className="text-white" fill="white" />
              : <Play  size={32} className="text-white ml-1" fill="white" />
            }
          </div>
        </button>

        {/* Top badge */}
        <div className="absolute top-4 left-4 z-30 flex items-center gap-2 bg-black/50 backdrop-blur-md border border-[#ba9eff]/20 px-3 py-1.5 rounded-full">
          <Sparkles size={12} className="text-[#ba9eff]" />
          <span className="text-[10px] font-black uppercase tracking-widest text-white/70">
            Comic Studio · Cinematic Video
          </span>
        </div>

        {/* Audio source badge */}
        {audioUrl && (
          <div className="absolute top-4 right-4 z-30 flex items-center gap-2 bg-black/50 backdrop-blur-md border border-[#69daff]/20 px-3 py-1.5 rounded-full">
            <Music size={10} className="text-[#69daff]" />
            <span className="text-[9px] font-black uppercase tracking-widest text-white/50">
              AI Narration
            </span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-[#0c0c0f]/90 backdrop-blur-xl border-t border-white/5 px-6 py-4 flex items-center gap-6">
        {/* Play / Pause */}
        <button
          onClick={togglePlay}
          className="w-10 h-10 rounded-full bg-[#ba9eff]/20 border border-[#ba9eff]/30 flex items-center justify-center text-[#ba9eff] hover:bg-[#ba9eff]/30 transition-all hover:scale-105 active:scale-95"
        >
          {playing
            ? <Pause size={18} fill="currentColor" />
            : <Play  size={18} fill="currentColor" className="ml-0.5" />
          }
        </button>

        {/* Scrubber */}
        <div
          className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden cursor-pointer"
          onClick={handleSeek}
        >
          <div
            className="h-full bg-gradient-to-r from-[#ba9eff] to-[#69daff] rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Mute (controls narration audio) */}
        <button
          onClick={handleMuteToggle}
          className="text-white/40 hover:text-white transition-colors"
          title={audioUrl ? "Toggle AI narration" : "No audio track"}
        >
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>

        {/* Download */}
        <a
          href={videoUrl}
          download="nolan-cinematic-video.mp4"
          target="_blank"
          rel="noopener noreferrer"
          className="text-white/40 hover:text-white transition-colors"
          title="Download video"
        >
          <Download size={18} />
        </a>

        {/* Fullscreen */}
        <button
          onClick={() => videoRef.current?.requestFullscreen?.()}
          className="text-white/40 hover:text-white transition-colors"
          title="Fullscreen"
        >
          <Maximize2 size={18} />
        </button>

        {/* Prompt reveal */}
        <button
          onClick={() => setShowPrompt(!showPrompt)}
          className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border transition-all ${
            showPrompt
              ? "bg-[#69daff]/15 border-[#69daff]/30 text-[#69daff]"
              : "border-white/10 text-white/30 hover:text-white/60 hover:border-white/20"
          }`}
        >
          Prompt
        </button>
      </div>

      {/* Prompt reveal panel */}
      <AnimatePresence>
        {showPrompt && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-[#0e0e11] border-t border-white/5"
          >
            <div className="px-6 py-4">
              <div className="text-[9px] font-black uppercase tracking-widest text-[#69daff] mb-2">
                AI-Synthesised Cinematic Prompt
              </div>
              <p className="text-xs text-white/50 leading-relaxed italic">
                "{prompt}"
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Error State ──────────────────────────────────────────────────────────────

function ErrorState({ message, onRetry, onClose }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8 text-center gap-6">
      <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
        <AlertTriangle size={36} className="text-red-400" />
      </div>
      <div>
        <h3 className="text-xl font-black text-white mb-2">Generation Failed</h3>
        <p className="text-white/40 text-sm max-w-sm leading-relaxed">{message}</p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={onRetry}
          className="px-6 py-2.5 rounded-full bg-[#ba9eff] text-black font-bold text-sm hover:bg-[#ba9eff]/80 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
        >
          <RotateCcw size={14} /> Try Again
        </button>
        <button
          onClick={onClose}
          className="px-6 py-2.5 rounded-full bg-white/5 text-white/60 font-bold text-sm border border-white/10 hover:bg-white/10 transition-all"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export function KlingVideoModal({
  isOpen,
  isGenerating,
  videoUrl,
  audioUrl,
  videoPrompt,
  loadingStage,
  error,
  onClose,
  onRegenerate,
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4"
        >
          <motion.div
            initial={{ scale: 0.92, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, y: 30, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-4xl bg-[#0e0e11] rounded-3xl overflow-hidden border border-white/8 shadow-[0_0_120px_rgba(186,158,255,0.12)] flex flex-col"
            style={{ maxHeight: "90vh" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#ba9eff]/30 to-[#69daff]/15 border border-[#ba9eff]/20 flex items-center justify-center shadow-[0_0_20px_rgba(186,158,255,0.15)]">
                  <Clapperboard size={16} className="text-[#ba9eff]" />
                </div>
                <div>
                  <h2 className="text-sm font-black uppercase tracking-widest text-white">
                    Cinematic Video Generator
                  </h2>
                  <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">
                    Comic Studio · Ken Burns Stitch
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Regenerate — only shown when a video is already loaded */}
                {videoUrl && !isGenerating && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onRegenerate}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:border-white/20 hover:bg-white/10 transition-all text-xs font-bold uppercase tracking-widest"
                  >
                    <RotateCcw size={13} />
                    Regenerate
                  </motion.button>
                )}

                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/30 hover:text-white transition-all"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div
              className="flex-1 overflow-hidden min-h-0"
              style={{ minHeight: "420px" }}
            >
              {isGenerating ? (
                <GeneratingOverlay stage={loadingStage} />
              ) : error ? (
                <ErrorState
                  message={error}
                  onRetry={onRegenerate}
                  onClose={onClose}
                />
              ) : videoUrl ? (
                <VideoPlayer
                  videoUrl={videoUrl}
                  audioUrl={audioUrl}
                  prompt={videoPrompt}
                />
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
