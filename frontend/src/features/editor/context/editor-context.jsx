"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { useParams } from "next/navigation";
import { useProjectData } from "@/hooks/useProjectData";
import { useSaveScene } from "@/hooks/useSaveScene";
import { useEditorOps } from "@/hooks/useEditorOps";

const STORAGE_KEY = "nolan_editor_state";

const defaultState = {
  projectTitle: "New Project",
  projectGenre: "",
  chapters: [],
  activeChapterId: null,
  activeSceneId: null,
  expandedChapterIds: [],
  activeMode: "Creative",
  ghostTextEnabled: true,
};

function loadFromStorage(projectId) {
  if (typeof window === "undefined") return defaultState;
  const storageKey = `${STORAGE_KEY}_${projectId || "default"}`;
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) return { ...defaultState, ...JSON.parse(raw) };
  } catch (_) {}
  return defaultState;
}

const EditorContext = createContext(null);

export function EditorProvider({ children }) {
  const params = useParams();
  const projectId = params?.projectId;

  // Backend connections
  const { projectData, chapters: backendChapters, isLoading } = useProjectData(projectId);
  const handleSaving = useCallback(() => setSaveStatus("saving"), []);
  const handleSaved = useCallback(() => setSaveStatus("saved"), []);
  const handleError = useCallback(() => setSaveStatus("error"), []);

  const { saveScene } = useSaveScene({
    onSaving: handleSaving,
    onSaved: handleSaved,
    onError: handleError
  });
  const ops = useEditorOps(); // Chapter/Scene CRUD

  // Initialize from storage once
  const [state, setState] = useState(() => loadFromStorage(projectId));
  const [saveStatus, setSaveStatus] = useState("saved"); // 'saved' | 'saving' | 'unsaved' | 'error'
  const [activePanel, setActivePanel] = useState("chapters"); // 'chapters' | 'characters' | 'lore' | 'timeline'
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [studioPanelOpen, setStudioPanelOpen] = useState(true);
  const [activeSuggestion, setActiveSuggestion] = useState(null);
  const [activeView, setActiveView] = useState("editor"); // 'editor' | 'graph'
  const [isReady, setIsReady] = useState(false);
  
  const initializedRef = useRef(false);

  // Load from backend
  useEffect(() => {
    if (initializedRef.current && (!projectData || isLoading)) return;
    
    const loaded = { ...state };
    

    // If backend data is loaded, hydrate from it instead of local storage
    if (projectData && !isLoading) {
      loaded.projectTitle = projectData.title || loaded.projectTitle;
      loaded.projectGenre = projectData.genre || loaded.projectGenre;
      
      // Hydrate real chapters/scenes from backend
      if (projectData.chapters && projectData.chapters.length > 0) {
        loaded.chapters = projectData.chapters;
        // Auto-select the first scene if nothing is active or active is mock
        if (!loaded.activeSceneId || loaded.activeSceneId.startsWith("sc-")) {
          loaded.activeChapterId = projectData.chapters[0].id;
          loaded.activeSceneId = projectData.chapters[0].scenes?.[0]?.id;
        }
      }
    }

    if (projectData && !isLoading) {
      initializedRef.current = true;
    }

    setState(loaded);
    setIsReady(true);
  }, [projectData, isLoading]); // Safe to keep deps now because initializedRef guards it

  // Persist to localStorage write-through cache
  const triggerLocalSave = useCallback((nextState) => {
    try {
      const storageKey = `${STORAGE_KEY}_${projectId || "default"}`;
      localStorage.setItem(storageKey, JSON.stringify(nextState));
    } catch (_) {}
  }, [projectId]);

  const updateState = useCallback(
    (updater) => {
      setState((prev) => {
        const next = typeof updater === "function" ? updater(prev) : { ...prev, ...updater };
        triggerLocalSave(next);
        return next;
      });
    },
    [triggerLocalSave]
  );

  // ─── Chapter operations ───────────────────────────────────────────────────
  const addChapter = useCallback(async () => {
    const tempId = `ch-${Date.now()}`;
    const tempSceneId = `sc-${Date.now()}-1`;
    const title = `Chapter ${state.chapters.length + 1}`;
    
    // Optimistic update
    updateState((prev) => ({
      ...prev,
      chapters: [
        ...prev.chapters,
        {
          id: tempId,
          title,
          scenes: [{ id: tempSceneId, title: "Scene 1", content: "<p>Begin writing...</p>" }],
        },
      ],
      expandedChapterIds: [...(prev.expandedChapterIds || []), tempId],
    }));

    if (projectId) {
      try {
        const newChapter = await ops.createChapter(projectId, title);
        if (newChapter && newChapter.id) {
          // Replace temp IDs with real ones (assuming first scene is also auto-created by backend with position 0)
          // The backend currently auto-creates a "Scene 1". We just need to reload or replace.
          // To be safe, we'll let useProjectData refetch handle it, or replace locally.
          // For now, let's just trigger a refetch or replace the chapter ID.
          updateState((prev) => ({
            ...prev,
            chapters: prev.chapters.map(c => 
              c.id === tempId ? { ...c, id: newChapter.id } : c
            )
          }));
        }
      } catch (e) {
        console.error("Failed to create chapter", e);
      }
    }
  }, [updateState, projectId, ops, state.chapters.length]);

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
      if (projectId) ops.deleteChapter(chapterId).catch(console.error);
    },
    [updateState, projectId, ops]
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
    async (chapterId) => {
      const chapter = state.chapters.find(c => c.id === chapterId);
      const sceneLength = chapter ? chapter.scenes.length : 0;
      const title = `Scene ${sceneLength + 1}`;
      const tempId = `sc-${Date.now()}`;
      
      updateState((prev) => ({
        ...prev,
        chapters: prev.chapters.map((c) =>
          c.id === chapterId
            ? {
                ...c,
                scenes: [
                  ...c.scenes,
                  { id: tempId, title, content: "<p>Begin writing...</p>" },
                ],
              }
            : c
        ),
        activeChapterId: chapterId,
        activeSceneId: tempId,
      }));

      // Await backend UUID
      if (projectId && !chapterId.startsWith("ch-")) {
        try {
          const newScene = await ops.createScene(chapterId, title);
          if (newScene && newScene.id) {
            updateState((prev) => ({
              ...prev,
              chapters: prev.chapters.map((c) =>
                c.id === chapterId
                  ? {
                      ...c,
                      scenes: c.scenes.map((s) => 
                        s.id === tempId ? { ...s, id: newScene.id } : s
                      ),
                    }
                  : c
              ),
              activeSceneId: prev.activeSceneId === tempId ? newScene.id : prev.activeSceneId
            }));
          }
        } catch (e) {
          console.error("Failed to create scene", e);
        }
      }
    },
    [updateState, projectId, state.chapters, ops]
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
      // Call the debounced backend save hook
      setSaveStatus("unsaved");
      if (projectId && sceneId) {
        saveScene(sceneId, content, projectId);
      }
    },
    [updateState, saveScene, projectId]
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
  
  const reorderScenes = useCallback(
    (chapterId, newScenes) => {
      updateState((prev) => ({
        ...prev,
        chapters: prev.chapters.map((c) => (c.id === chapterId ? { ...c, scenes: newScenes } : c)),
      }));
    },
    [updateState]
  );
  
  const updateSceneMetadata = useCallback(
    (sceneId, metadata) => {
      updateState((prev) => ({
        ...prev,
        chapters: prev.chapters.map((c) => ({
          ...c,
          scenes: c.scenes.map((s) => (s.id === sceneId ? { ...s, metadata: { ...s.metadata, ...metadata } } : s)),
        })),
      }));
    },
    [updateState]
  );
  
  const setActiveMode = useCallback((mode) => {
    updateState((prev) => {
      const isCreative = mode === "Creative";
      const isThinking = mode === "Thinking";
      const isPlanning = mode === "Planning";
      
      // Auto-collapse sidebars for Creative mode, but keep them accessible
      if (isCreative) {
        setSidebarOpen(false);
        setStudioPanelOpen(false);
      } else if (isThinking) {
        setSidebarOpen(false); // Focus on Text + AI Studio
        setStudioPanelOpen(true);
      } else if (isPlanning) {
        setSidebarOpen(true);
        setStudioPanelOpen(true);
      }
      
      return { ...prev, activeMode: mode };
    });
  }, [updateState]);

  const setGhostTextEnabled = useCallback((enabled) => {
    updateState((prev) => ({ ...prev, ghostTextEnabled: enabled }));
  }, [updateState]);

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
    isPlanningMode: state.activeMode === "Planning",
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
    setActiveMode,
    reorderScenes,
    updateSceneMetadata,
    setGhostTextEnabled,
    
    // Linter
    activeSuggestion,
    setActiveSuggestion,
    
    // View
    activeView,
    setActiveView,
  };

  if (!isReady) {
    // Return a dark filler so it doesn't flash white during the split-second hydration check
    return <div className="h-screen w-screen bg-[#0e0e11]" />;
  }

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

export function useEditorContext() {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("useEditorContext must be used within EditorProvider");
  return ctx;
}
