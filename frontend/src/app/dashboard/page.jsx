"use client";

import React from "react";
import { DashboardProvider } from "@/features/dashboard/context/dashboard-context";
import { DashboardSidebar } from "@/features/dashboard/components/dashboard-sidebar";
import { DashboardTopbar } from "@/features/dashboard/components/dashboard-topbar";
import { ProjectGrid } from "@/features/dashboard/components/project-grid";

export default function DashboardPage() {
  return (
    <DashboardProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-[#0e0e11] text-white font-sans">
        {/* Left Sidebar */}
        <DashboardSidebar />

        {/* Main Canvas */}
        <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
          {/* Top Bar */}
          <DashboardTopbar />

          {/* Scrollable Content */}
          <main className="flex-1 overflow-y-auto px-8 py-7 scrollbar-thin">
            <ProjectGrid />
          </main>
        </div>
      </div>
    </DashboardProvider>
  );
}
