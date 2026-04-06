"use client";

import React, { useState } from "react";
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
} from "lucide-react";
import { useEditorContext } from "@/features/editor/context/editor-context";

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

function CharactersPanel() {
  const characters = [
    { name: "The Hare", role: "Protagonist", initials: "TH", color: "from-[#ba9eff] to-[#69daff]" },
    { name: "The Lion", role: "Antagonist", initials: "TL", color: "from-amber-400 to-orange-500" },
    { name: "Forest Animals", role: "Supporting", initials: "FA", color: "from-emerald-400 to-teal-500" },
  ];
  return (
    <div className="space-y-2 p-2">
      {characters.map((c) => (
        <div key={c.name} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 cursor-pointer group transition-colors">
          <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${c.color} flex items-center justify-center text-black text-xs font-bold flex-shrink-0 shadow-lg shadow-black/20`}>
            {c.initials}
          </div>
          <div>
            <div className="text-sm font-semibold text-white/80 group-hover:text-white transition-colors">{c.name}</div>
            <div className="text-[11px] text-white/30">{c.role}</div>
          </div>
        </div>
      ))}
      <button className="flex items-center gap-2.5 w-full px-4 py-3 text-xs font-medium text-white/25 hover:text-primary/70 transition-all rounded-xl hover:bg-white/5 mt-2">
        <Plus size={14} /> Add Character
      </button>
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
  const events = [
    { label: "Lion's Decree", time: "Day 1", color: "bg-red-400" },
    { label: "Animals Begin Visits", time: "Day 2-30", color: "bg-amber-400" },
    { label: "Hare's Turn", time: "Day 31", color: "bg-primary" },
    { label: "Hare's Plan", time: "Day 31 Late", color: "bg-[#69daff]" },
    { label: "Lion Defeated", time: "Day 32", color: "bg-emerald-400" },
  ];
  return (
    <div className="relative p-3">
      <div className="absolute left-7 top-8 bottom-4 w-px bg-white/10" />
      <div className="space-y-4">
        {events.map((e) => (
          <div key={e.label} className="flex items-start gap-3 relative">
            <div className={`w-2.5 h-2.5 rounded-full ${e.color} flex-shrink-0 mt-0.5 z-10 ring-2 ring-[#0e0e11]`} />
            <div>
              <div className="text-xs font-semibold text-white/80">{e.label}</div>
              <div className="text-[10px] text-white/30">{e.time}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function EditorSidebar() {
  const { chapters, sidebarOpen, setSidebarOpen, addChapter } = useEditorContext();
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
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
