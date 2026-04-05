"use client";

import React, { useState } from "react";
import { Search, Bell, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Navbar() {
  // TODO: Replace with real auth logic
  const [isLoggedIn] = useState(false);

  return (
    <header className="fixed top-0 w-full z-50 flex justify-between items-center px-6 h-16 bg-[#0e0e11]/60 backdrop-blur-xl border-b border-white/5 font-heading tracking-tight shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
      <div className="flex items-center gap-8">
        <span className="text-xl font-bold bg-gradient-to-r from-[#ba9eff] to-[#69daff] bg-clip-text text-transparent">
          Ethereal Studio
        </span>
        <nav className="hidden md:flex gap-6 items-center">
          <a className="text-[#ba9eff] border-b-2 border-[#ba9eff] pb-1" href="#home">
            Creative
          </a>
          <a className="text-slate-400 hover:text-white transition-colors" href="#planning">
            Planning
          </a>
          <a className="text-slate-400 hover:text-white transition-colors" href="#thinking">
            Thinking
          </a>
        </nav>
      </div>

      <div className="flex items-center gap-4">
        {isLoggedIn ? (
          <>
            <button className="bg-primary text-on-primary-container px-4 py-2 rounded-lg font-bold text-sm hover:bg-[#a27cff] transition-all active:scale-95 text-black">
              New Project
            </button>
            <div className="flex items-center gap-3 ml-2 border-l border-white/10 pl-4">
              <Bell className="text-slate-400 hover:text-white cursor-pointer transition-colors" size={20} />
              <Settings className="text-slate-400 hover:text-white cursor-pointer transition-colors" size={20} />
              <div className="w-8 h-8 rounded-full flex items-center justify-center border border-white/10 overflow-hidden bg-card">
                <img
                  alt="User profile"
                  className="w-full h-full object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCcSuFTodYox2USwowTvg8be77SclSWo7En1As4dRH0fAaO3gD5-dnd5T_6u1R1s_GcXw7iPTO-RS-llrSlkIV6BSOLmtjxZX3vILqCGl_E1PSnlec8nsXP-Yc5VVZnkDgqEnG9789na_jsDaVAxADYp_ww2TGeH7IEq51cLCCrC6I4q8uPPb4feW-Q5d5ohSTCN_QG12eQST_u5h6ji8_a4abYA1p9IdT6C32VlFxgucyz_F5v6CFwQx9IpkilbtvNCkr1NC0gvyg"
                />
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3 ml-2 border-l border-white/10 pl-4">
            <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/10 transition-all hover:scale-105 active:scale-95">
              Sign In
            </Button>
            <Button className="bg-gradient-to-r from-primary to-[#69daff] text-black font-bold border-none hover:opacity-90 transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(186,158,255,0.4)] active:scale-95">
              Get Started
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
