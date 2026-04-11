"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";

/**
 * AuthProvider — boots the Supabase auth listener globally.
 * Must be a Client Component so it can call initializeAuth() on mount.
 * Renders children immediately (non-blocking) so the UI is never delayed.
 */
export function AuthProvider({ children }) {
  const initializeAuth = useAuthStore((s) => s.initializeAuth);

  useEffect(() => {
    // Returns the cleanup fn that unsubscribes the Supabase listener
    let cleanup;
    initializeAuth().then((fn) => {
      cleanup = fn;
    });
    return () => {
      if (typeof cleanup === "function") cleanup();
    };
  }, [initializeAuth]);

  return children;
}
