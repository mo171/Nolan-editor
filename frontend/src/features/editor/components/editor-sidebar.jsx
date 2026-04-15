"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  FileText,
  Users,
  BookOpen,
  Clock,
  MoreHorizontal,
  FolderOpen,
  Network,
  Sparkles,
} from "lucide-react";
import { useEditorContext } from "@/features/editor/context/editor-context";
import { useParams } from "next/navigation";
import { useCharacters } from "@/hooks/useCharacters";
import { useTimeline } from "@/hooks/useTimeline";
import { AvatarWizardModal } from "./avatar-wizard-modal";

function SceneItem({ scene, chapter, isActive }) {
  const { setActiveScene, updateSceneTitle } = useEditorContext();
  const [editing, setEditing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      className={`group relative flex items-center gap-2 pl-8 pr-2 py-2.5 rounded-xl cursor-pointer transition-all duration-150 ${
        isActive
          ? "bg-[#69daff]/15 text-[#69daff]"
          : "text-white/50 hover:text-white/80 hover:bg-white/5"
      }`}
      onClick={() => !editing && setActiveScene(chapter.id, scene.id)}
    >
      <FileText size={12} className="flex-shrink-0" />
      {editing ? (
        <input
          autoFocus
          defaultValue={scene.title}
          className="bg-transparent border-b border-primary/30 text-white/90 text-xs outline-none flex-1 py-0.5"
          onBlur={(e) => {
            updateSceneTitle(scene.id, e.target.value);
            setEditing(false);
          }}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") e.target.blur(); }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="text-xs flex-1 truncate">{scene.title}</span>
      )}
      {isActive && (
        <button
          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-white/10 transition-all"
          onClick={(e) => { e.stopPropagation(); setEditing(true); }}
        >
          <MoreHorizontal size={12} />
        </button>
      )}
    </div>
  );
}

function ChapterItem({ chapter }) {
  const {
    activeChapterId,
    activeSceneId,
    expandedChapterIds,
    toggleChapterExpanded,
    addScene,
    deleteChapter,
    updateChapterTitle,
  } = useEditorContext();

  const isExpanded = expandedChapterIds?.includes(chapter.id);
  const isActive = activeChapterId === chapter.id;
  const [editing, setEditing] = useState(false);

  const chapterColor = isActive ? "text-white" : "text-white/60";
  const sceneCount = chapter.scenes.length;

  return (
    <div className="mb-1">
      {/* Chapter Header */}
      <div
        className={`group flex items-center gap-2 px-2.5 py-2.5 rounded-xl cursor-pointer transition-all duration-150 ${
          isActive ? "bg-white/5" : "hover:bg-white/5"
        }`}
        onClick={() => toggleChapterExpanded(chapter.id)}
      >
        <button
          className={`p-0.5 rounded text-white/30 hover:text-white/60 transition-colors flex-shrink-0`}
          onClick={(e) => { e.stopPropagation(); toggleChapterExpanded(chapter.id); }}
        >
          {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </button>

        <div
          className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
            isActive
              ? "bg-gradient-to-br from-primary to-[#69daff] text-black"
              : "bg-white/10 text-white/50"
          }`}
        >
          {chapter.title.slice(-2)}
        </div>

        {editing ? (
          <input
            autoFocus
            defaultValue={chapter.title}
            className="bg-transparent border-b border-primary/30 text-white/90 text-xs outline-none flex-1 py-0.5"
            onBlur={(e) => { updateChapterTitle(chapter.id, e.target.value); setEditing(false); }}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") e.target.blur(); }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span
            className={`text-xs font-semibold flex-1 truncate ${chapterColor}`}
            onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); }}
          >
            {chapter.title}
          </span>
        )}

        <span className="text-[10px] text-white/25 flex-shrink-0">{sceneCount} Ch</span>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); addScene(chapter.id); }}
            className="p-0.5 rounded hover:bg-white/10 text-white/40 hover:text-white/70 transition-all"
            title="Add scene"
          >
            <Plus size={11} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); deleteChapter(chapter.id); }}
            className="p-0.5 rounded hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-all"
            title="Delete chapter"
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>

      {/* Scenes */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="mt-0.5 space-y-0.5">
              {chapter.scenes.map((scene) => (
                <SceneItem
                  key={scene.id}
                  scene={scene}
                  chapter={chapter}
                  isActive={activeSceneId === scene.id}
                />
              ))}
              <button
                onClick={() => addScene(chapter.id)}
                className="flex items-center gap-2 pl-8 pr-2 py-2 text-xs text-white/20 hover:text-primary/70 transition-colors w-full font-medium"
              >
                <Plus size={11} />
                Add Scene
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const PANELS = [
  { id: "chapters", icon: FolderOpen, label: "Outliner" },
  { id: "characters", icon: Users, label: "Characters" },
  { id: "lore", icon: BookOpen, label: "Lore" },
  { id: "timeline", icon: Clock, label: "Timeline" },
];

// ─── Emotion dot color ───────────────────────────────────────────────────────
const EMOTION_COLORS = {
  joy: "bg-yellow-400", sadness: "bg-blue-400", anger: "bg-red-500",
  fear: "bg-violet-400", surprise: "bg-cyan-400", disgust: "bg-green-500", neutral: "bg-white/30",
};

function CharacterCard({ c, isExtracted }) {
  const [expanded, setExpanded] = useState(false);

  const getInitials = (name) => {
    if (!name) return "?";
    const parts = name.split(" ");
    return parts.length > 1 ? parts[0][0] + parts[1][0] : parts[0].slice(0, 2);
  };

  const getGradient = (name) => {
    const g = ["from-[#ba9eff] to-[#69daff]","from-amber-400 to-orange-500","from-emerald-400 to-teal-500","from-rose-400 to-red-500","from-blue-400 to-indigo-500"];
    return !name ? g[0] : g[name.charCodeAt(0) % g.length];
  };

  const traits = c.traits || [];
  const emotionKey = (c.last_known_emotion || "neutral").toLowerCase();
  const emotionDot = EMOTION_COLORS[emotionKey] || EMOTION_COLORS.neutral;
  const hasDetails = c.description || traits.length > 0 || c.arc_summary || c.last_known_emotion || c.ai_visual_summary;

  return (
    <div
      className="rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 mb-1.5 transition-all duration-200 overflow-hidden cursor-pointer"
      onClick={() => hasDetails && setExpanded((e) => !e)}
    >
      <div className="flex items-center gap-3 px-3 py-2.5">
        {c.image_url ? (
          <img src={c.image_url} alt={c.name}
            className="w-8 h-8 rounded-full object-cover ring-2 ring-[#ba9eff]/30 shadow-md flex-shrink-0" />
        ) : (
          <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getGradient(c.name)} flex items-center justify-center text-black text-[10px] font-bold flex-shrink-0 shadow-md`}>
            {getInitials(c.name).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-white/85 truncate">{c.name}</span>
            {isExtracted && c.last_known_emotion && (
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${emotionDot}`} title={c.last_known_emotion} />
            )}
          </div>
          <div className="text-[10px] text-white/35 truncate">
            {c.role || (c.total_mentions ? `${c.total_mentions} mentions` : "Character")}
          </div>
        </div>
        {hasDetails && (
          <div className={`text-white/20 transition-transform duration-200 flex-shrink-0 ${expanded ? "rotate-90" : ""}`}>
            <ChevronRight size={12} />
          </div>
        )}
      </div>
      <AnimatePresence initial={false}>
        {expanded && hasDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2 border-t border-white/5 pt-2">
              {c.ai_visual_summary ? (
                <p className="text-[11px] text-[#ba9eff]/60 italic leading-relaxed border-l-2 border-[#ba9eff]/20 pl-2">
                  ✦ {c.ai_visual_summary}
                </p>
              ) : c.description ? (
                <p className="text-[11px] text-white/55 leading-relaxed">{c.description}</p>
              ) : null}
              {traits.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {traits.slice(0, 5).map((t) => (
                    <span key={t} className="px-2 py-0.5 bg-primary/10 text-primary/70 rounded-full text-[9px] font-semibold border border-primary/15">{t}</span>
                  ))}
                  {traits.length > 5 && <span className="px-2 py-0.5 bg-white/5 text-white/30 rounded-full text-[9px]">+{traits.length - 5}</span>}
                </div>
              )}
              {c.arc_summary && (
                <p className="text-[10px] text-white/35 italic leading-relaxed border-l border-primary/20 pl-2">{c.arc_summary}</p>
              )}
              {(c.last_known_location || c.last_known_emotion) && (
                <div className="flex flex-wrap gap-2 text-[9px] text-white/30">
                  {c.last_known_location && <span>📍 {c.last_known_location}</span>}
                  {c.last_known_emotion && <span className="capitalize">🎭 {c.last_known_emotion}</span>}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CharactersPanel() {
  const params = useParams();
  const projectId = params?.projectId;
  const { projectCharacters, extractedCharacters, isLoading, refetch } = useCharacters(projectId);
  const [wizardOpen, setWizardOpen] = useState(false);

  // Characters without an image generated yet
  const allChars = [...(projectCharacters || []), ...(extractedCharacters || [])];
  const pendingChars = allChars.filter(c => !c.image_url);
  const pendingCount = pendingChars.length;

  if (isLoading) {
    return (
      <div className="space-y-2 p-2">
        <div className="h-14 bg-white/5 rounded-xl animate-pulse" />
        <div className="h-14 bg-white/5 rounded-xl animate-pulse" />
        <div className="h-14 bg-white/5 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-2">
      {projectCharacters?.length > 0 && (
        <div className="mb-3">
          <h3 className="text-[10px] uppercase font-bold text-white/40 mb-2 px-1">Main Cast</h3>
          {projectCharacters.map((c) => <CharacterCard key={c.id || c.name} c={c} isExtracted={false} />)}
        </div>
      )}
      {extractedCharacters?.length > 0 && (
        <div className="mb-3">
          <h3 className="text-[10px] uppercase font-bold text-white/40 mb-2 px-1">Discovered</h3>
          {extractedCharacters.map((c) => <CharacterCard key={c.id || c.name} c={c} isExtracted={true} />)}
        </div>
      )}
      {(!projectCharacters?.length && !extractedCharacters?.length) && (
        <div className="text-center py-6 text-white/30 text-xs">
          No characters yet. Start typing to discover them.
        </div>
      )}

      {pendingCount > 0 && (
        <button 
          onClick={() => setWizardOpen(true)}
          className="flex items-center justify-center gap-2 w-full px-4 py-2 mt-2 text-[10px] font-bold uppercase tracking-widest text-[#ba9eff] bg-[#ba9eff]/10 border border-[#ba9eff]/20 rounded-xl hover:bg-[#ba9eff]/20 hover:border-[#ba9eff]/40 transition-all shadow-[0_0_15px_rgba(186,158,255,0.1)]"
        >
          <Sparkles size={13} />
          Generate Avatars
          <span className="bg-[#ba9eff] text-black text-[9px] rounded-full px-1.5 py-0.5 leading-none shadow-sm font-extrabold flex items-center justify-center min-w-[20px]">
            {pendingCount}
          </span>
        </button>
      )}

      <button className="flex items-center justify-center gap-2 w-full px-4 py-2 mt-2 text-xs font-medium text-white/40 border border-white/5 hover:text-white transition-all rounded-xl hover:bg-white/5">
        <Plus size={14} /> Add Character
      </button>

      <AvatarWizardModal
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        projectId={projectId}
        pendingChars={pendingChars}
        onSuccess={() => refetch()}
      />
    </div>
  );
}

function LorePanel() {
  const tags = ["Jungle Kingdom", "Lion's Den", "Forest Law", "Animal Council", "Sacred Oath", "The Den Route"];
  return (
    <div className="p-3 space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {tags.map((t) => (
          <span key={t} className="px-2 py-1 bg-primary/10 text-primary/80 rounded-full text-[10px] font-medium cursor-pointer hover:bg-primary/20 transition-colors">
            {t}
          </span>
        ))}
      </div>
      <button className="flex items-center gap-2.5 w-full px-4 py-3 text-xs font-medium text-white/25 hover:text-primary/70 transition-all rounded-xl hover:bg-white/5">
        <Plus size={14} /> Add Lore Entry
      </button>
    </div>
  );
}

function TimelinePanel() {
  const params = useParams();
  const projectId = params?.projectId;
  const { projectCharacters, extractedCharacters } = useCharacters(projectId);
  const { timeline, fetchCharacterTimeline, isLoading } = useTimeline(projectId);
  const [selectedChar, setSelectedChar] = useState(null);

  const allChars = [...(projectCharacters || []), ...(extractedCharacters || [])];

  useEffect(() => {
    if (!selectedChar && allChars.length > 0) {
      setSelectedChar(allChars[0].name);
    }
  }, [allChars, selectedChar]);

  useEffect(() => {
    if (selectedChar) {
      fetchCharacterTimeline(selectedChar);
    }
  }, [selectedChar, fetchCharacterTimeline]);

  return (
    <div className="p-3">
      {allChars.length > 0 ? (
        <select 
          value={selectedChar || ""}
          onChange={(e) => setSelectedChar(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg text-xs p-2 mb-4 text-white/80 outline-none"
        >
          {allChars.map(c => (
            <option key={c.name} value={c.name}>{c.name}</option>
          ))}
        </select>
      ) : (
        <div className="text-white/30 text-xs text-center pb-4">
          Add characters to see timelines.
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4 px-2">
          <div className="h-4 w-2/3 bg-white/5 rounded animate-pulse" />
          <div className="h-4 w-full bg-white/5 rounded animate-pulse" />
          <div className="h-4 w-5/6 bg-white/5 rounded animate-pulse" />
        </div>
      ) : timeline?.length > 0 ? (
        <div className="relative pl-1">
          <div className="absolute left-2.5 top-2 bottom-4 w-px bg-white/10" />
          <div className="space-y-4">
            {timeline.map((scene, idx) => (
              <div key={scene.id || idx} className="flex items-start gap-4 relative">
                <div className={`w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1 z-10 ring-4 ring-[#0c0c0f]`} />
                <div>
                  <div className="text-xs font-semibold text-white/80">{scene.title}</div>
                  <div className="text-[10px] text-white/30">Chapter {scene.chapter_id?.slice(-4) || "?"}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : selectedChar ? (
        <div className="text-white/30 text-[10px] text-center italic">
          No narrative events found for this character yet.
        </div>
      ) : null}
    </div>
  );
}

export function EditorSidebar() {
  const { chapters, sidebarOpen, setSidebarOpen, addChapter, activeView, setActiveView } = useEditorContext();
  const [activeTab, setActiveTab] = useState("chapters");

  const activePanel = PANELS.find((p) => p.id === activeTab);

  return (
    <AnimatePresence initial={false}>
      {sidebarOpen && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 250, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="flex-shrink-0 h-full overflow-hidden bg-[#0c0c0f] border-r border-white/5 flex flex-col"
          style={{ width: 250 }}
        >
          {/* Panel Tab Switcher */}
          <div className="flex items-center gap-1 px-3 pt-3 pb-2 flex-shrink-0">
            {PANELS.map((panel) => {
              const Icon = panel.icon;
              return (
                <button
                  key={panel.id}
                  onClick={() => setActiveTab(panel.id)}
                  title={panel.label}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                    activeTab === panel.id
                      ? "bg-white/10 text-white shadow-sm"
                      : "text-white/30 hover:text-white/60 hover:bg-white/5"
                  }`}
                >
                  <Icon size={13} />
                  {activeTab === panel.id && <span>{panel.label}</span>}
                </button>
              );
            })}
          </div>

          {/* Panel Header */}
          <div className="flex items-center justify-between px-3 pb-2 flex-shrink-0">
            <span className="text-xs font-bold text-white/50 uppercase tracking-wider">
              {activePanel?.label}
            </span>
            {activeTab === "chapters" && (
              <button
                onClick={addChapter}
                className="p-1 rounded-md hover:bg-white/10 text-white/30 hover:text-white/70 transition-all"
                title="Add Chapter"
              >
                <Plus size={14} />
              </button>
            )}
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-y-auto px-2 py-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.15 }}
              >
                {activeTab === "chapters" && (
                  <div className="space-y-0.5">
                    {chapters.map((chapter) => (
                      <ChapterItem key={chapter.id} chapter={chapter} />
                    ))}
                    <button
                      onClick={addChapter}
                      className="flex items-center gap-2 w-full px-4 py-3 text-xs font-medium text-white/25 hover:text-primary/70 transition-all rounded-xl hover:bg-white/5 mt-2"
                    >
                      <Plus size={14} />
                      Add Chapter
                    </button>
                  </div>
                )}
                {activeTab === "characters" && <CharactersPanel />}
                {activeTab === "lore" && <LorePanel />}
                {activeTab === "timeline" && <TimelinePanel />}
              </motion.div>
            </AnimatePresence>
          </div>
          {/* Bottom Actions */}
          <div className="p-3 border-t border-white/5 space-y-2">
            <button 
              onClick={() => setActiveView(activeView === 'editor' ? 'graph' : 'editor')}
              className={`flex items-center gap-3 w-full px-4 py-3 text-xs font-bold uppercase tracking-widest transition-all rounded-xl border-dashed border
                ${activeView === 'graph' 
                  ? 'bg-[#ba9eff]/10 text-[#ba9eff] border-[#ba9eff]/40 shadow-[0_0_15px_rgba(186,158,255,0.15)]' 
                  : 'text-white/30 hover:text-white/60 hover:bg-white/5 border-white/10'}
              `}
            >
              <Network size={14} className={activeView === 'graph' ? 'animate-pulse' : ''} />
              {activeView === 'graph' ? 'Studio Editor' : 'Story Graph'}
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
