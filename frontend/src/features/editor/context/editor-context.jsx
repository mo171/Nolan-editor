"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";

const STORAGE_KEY = "nolan_editor_state";

const defaultChapters = [
  {
    id: "ch-1",
    title: "Chapter 1",
    scenes: [
      { id: "sc-1-1", title: "Reference Material", content: "<h1>Reference Material</h1><p>The hare and the lion story in English. Once upon a time, there was a huge jungle. The ruler of this jungle was a fierce lion. Every animal was afraid of his strength and cruelty...</p><p>The animals had to obey all his orders even if they were harmed doing so. One day, the lion ordered all the animals and said, \"To maintain the safety of your communities, every day, one animal will visit my den and be my prey.\" The animals were astonished by the order made by the lion but they had no choice.</p><p>They had to listen to what he said or he would kill all the animals at once. Hence, they will have to send a family member every day to let others survive. Animals started to visit his den one by one every day.</p>" },
      { id: "sc-1-2", title: "Opening Scene", content: "<h1>Opening Scene</h1><p>Start your story here...</p>" },
    ],
  },
];

const defaultState = {
  projectTitle: "The Hare and the Lion Story in English",
  projectGenre: "Thriller",
  chapters: defaultChapters,
  activeChapterId: "ch-1",
  activeSceneId: "sc-1-1",
  expandedChapterIds: ["ch-1"],
};

function loadFromStorage() {
  if (typeof window === "undefined") return defaultState;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaultState, ...JSON.parse(raw) };
  } catch (_) {}
  return defaultState;
}

const EditorContext = createContext(null);

export function EditorProvider({ children }) {
  const [state, setState] = useState(defaultState);
  const [saveStatus, setSaveStatus] = useState("saved"); // 'saved' | 'saving' | 'unsaved'
  const [activePanel, setActivePanel] = useState("chapters"); // 'chapters' | 'characters' | 'lore' | 'timeline'
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [studioPanelOpen, setStudioPanelOpen] = useState(true);
  const saveTimerRef = useRef(null);

  // Load from storage on mount
  useEffect(() => {
    const loaded = loadFromStorage();
    setState(loaded);
  }, []);

  // Persist to localStorage with debounce
  const triggerSave = useCallback((nextState) => {
    setSaveStatus("unsaved");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      setSaveStatus("saving");
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
      } catch (_) {}
      setTimeout(() => setSaveStatus("saved"), 600);
    }, 1500);
  }, []);

  const updateState = useCallback(
    (updater) => {
      setState((prev) => {
        const next = typeof updater === "function" ? updater(prev) : { ...prev, ...updater };
        triggerSave(next);
        return next;
      });
    },
    [triggerSave]
  );

  // ─── Chapter operations ───────────────────────────────────────────────────
  const addChapter = useCallback(() => {
    const id = `ch-${Date.now()}`;
    const sceneId = `sc-${Date.now()}-1`;
    updateState((prev) => ({
      ...prev,
      chapters: [
        ...prev.chapters,
        {
          id,
          title: `Chapter ${prev.chapters.length + 1}`,
          scenes: [{ id: sceneId, title: "Scene 1", content: "<p>Begin writing...</p>" }],
        },
      ],
      expandedChapterIds: [...(prev.expandedChapterIds || []), id],
    }));
  }, [updateState]);

  const deleteChapter = useCallback(
    (chapterId) => {
      updateState((prev) => {
        const chapters = prev.chapters.filter((c) => c.id !== chapterId);
        return {
          ...prev,
          chapters,
          activeChapterId: chapters[0]?.id ?? null,
          activeSceneId: chapters[0]?.scenes[0]?.id ?? null,
        };
      });
    },
    [updateState]
  );

  const updateChapterTitle = useCallback(
    (chapterId, title) => {
      updateState((prev) => ({
        ...prev,
        chapters: prev.chapters.map((c) => (c.id === chapterId ? { ...c, title } : c)),
      }));
    },
    [updateState]
  );

  const toggleChapterExpanded = useCallback(
    (chapterId) => {
      setState((prev) => ({
        ...prev,
        expandedChapterIds: prev.expandedChapterIds?.includes(chapterId)
          ? prev.expandedChapterIds.filter((id) => id !== chapterId)
          : [...(prev.expandedChapterIds || []), chapterId],
      }));
    },
    []
  );

  // ─── Scene operations ─────────────────────────────────────────────────────
  const addScene = useCallback(
    (chapterId) => {
      const sceneId = `sc-${Date.now()}`;
      updateState((prev) => ({
        ...prev,
        chapters: prev.chapters.map((c) =>
          c.id === chapterId
            ? {
                ...c,
                scenes: [
                  ...c.scenes,
                  { id: sceneId, title: `Scene ${c.scenes.length + 1}`, content: "<p>Begin writing...</p>" },
                ],
              }
            : c
        ),
        activeChapterId: chapterId,
        activeSceneId: sceneId,
      }));
    },
    [updateState]
  );

  const updateSceneContent = useCallback(
    (sceneId, content) => {
      updateState((prev) => ({
        ...prev,
        chapters: prev.chapters.map((c) => ({
          ...c,
          scenes: c.scenes.map((s) => (s.id === sceneId ? { ...s, content } : s)),
        })),
      }));
    },
    [updateState]
  );

  const updateSceneTitle = useCallback(
    (sceneId, title) => {
      updateState((prev) => ({
        ...prev,
        chapters: prev.chapters.map((c) => ({
          ...c,
          scenes: c.scenes.map((s) => (s.id === sceneId ? { ...s, title } : s)),
        })),
      }));
    },
    [updateState]
  );

  const setActiveScene = useCallback((chapterId, sceneId) => {
    setState((prev) => ({ ...prev, activeChapterId: chapterId, activeSceneId: sceneId }));
  }, []);

  const updateProjectTitle = useCallback(
    (title) => updateState((prev) => ({ ...prev, projectTitle: title })),
    [updateState]
  );

  const updateProjectGenre = useCallback(
    (genre) => updateState((prev) => ({ ...prev, projectGenre: genre })),
    [updateState]
  );

  // ─── Derived values ───────────────────────────────────────────────────────
  const activeChapter = state.chapters.find((c) => c.id === state.activeChapterId) ?? state.chapters[0];
  const activeScene =
    activeChapter?.scenes.find((s) => s.id === state.activeSceneId) ?? activeChapter?.scenes[0];
  const activeSceneIndex = activeChapter?.scenes.findIndex((s) => s.id === activeScene?.id) ?? 0;
  const totalScenes = activeChapter?.scenes.length ?? 0;

  const value = {
    // State
    ...state,
    saveStatus,
    activePanel,
    sidebarOpen,
    studioPanelOpen,
    activeChapter,
    activeScene,
    activeSceneIndex,
    totalScenes,

    // Actions
    setActivePanel,
    setSidebarOpen,
    setStudioPanelOpen,
    addChapter,
    deleteChapter,
    updateChapterTitle,
    toggleChapterExpanded,
    addScene,
    updateSceneContent,
    updateSceneTitle,
    setActiveScene,
    updateProjectTitle,
    updateProjectGenre,
  };

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

export function useEditorContext() {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("useEditorContext must be used within EditorProvider");
  return ctx;
}
