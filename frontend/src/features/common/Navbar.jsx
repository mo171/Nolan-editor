"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, useAuthActions } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Loader2, LogOut, LayoutDashboard } from "lucide-react";

export function Navbar() {
  const { isAuthenticated, loading, user } = useAuth();
  const { signOut } = useAuthActions();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push("/");
  }

  return (
    <header className="fixed top-0 w-full z-50 flex justify-between items-center px-6 h-16 bg-[#0e0e11]/60 backdrop-blur-xl border-b border-white/5 font-heading tracking-tight shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
      <div className="flex items-center gap-8">
        <Link href="/">
          <span className="text-xl font-bold bg-gradient-to-r from-[#ba9eff] to-[#69daff] bg-clip-text text-transparent">
            Nolan AI Studio
          </span>
        </Link>
        <nav className="hidden md:flex gap-6 items-center">
          <a className="text-[#ba9eff] border-b-2 border-[#ba9eff] pb-1 text-sm" href="#home">
            Creative
          </a>
          <a className="text-slate-400 hover:text-white transition-colors text-sm" href="#planning">
            Planning
          </a>
          <a className="text-slate-400 hover:text-white transition-colors text-sm" href="#thinking">
            Thinking
          </a>
        </nav>
      </div>

      <div className="flex items-center gap-4">
        {loading ? (
          /* Auth is still initializing — show a subtle skeleton so the user doesn't see a flash */
          <div className="flex items-center gap-3 ml-2 border-l border-white/10 pl-4">
            <div className="w-20 h-8 rounded-lg bg-white/5 animate-pulse" />
            <div className="w-24 h-8 rounded-lg bg-white/5 animate-pulse" />
          </div>
        ) : isAuthenticated ? (
          /* ── Logged-in state ───────────────────────────────────────────── */
          <div className="flex items-center gap-3 ml-2 border-l border-white/10 pl-4">
            <Link href="/dashboard">
              <Button
                variant="ghost"
                className="flex items-center gap-2 text-slate-300 hover:text-white hover:bg-white/10 transition-all hover:scale-105 active:scale-95"
              >
                <LayoutDashboard size={15} />
                Dashboard
              </Button>
            </Link>
            <Button
              onClick={handleSignOut}
              variant="ghost"
              className="flex items-center gap-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all active:scale-95"
            >
              <LogOut size={15} />
              Logout
            </Button>
            {/* Avatar dot */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-[#69daff] flex items-center justify-center text-black text-xs font-bold flex-shrink-0">
              {user?.email?.charAt(0)?.toUpperCase() ?? "U"}
            </div>
          </div>
        ) : (
          /* ── Logged-out state ──────────────────────────────────────────── */
          <div className="flex items-center gap-3 ml-2 border-l border-white/10 pl-4">
            <Link href="/login">
              <Button
                variant="ghost"
                className="text-slate-300 hover:text-white hover:bg-white/10 transition-all hover:scale-105 active:scale-95"
              >
                Sign In
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-gradient-to-r from-primary to-[#69daff] text-black font-bold border-none hover:opacity-90 transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(186,158,255,0.4)] active:scale-95">
                Get Started
              </Button>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
