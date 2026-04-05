import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center min-h-screen p-8">
      <main className="flex flex-col items-center justify-center max-w-4xl w-full text-center space-y-12">
        <div className="space-y-6">
          <h1 className="text-5xl md:text-7xl font-heading font-semibold tracking-tight text-foreground">
            The Ethereal <span className="bg-gradient-to-r from-primary to-[#69daff] text-transparent bg-clip-text">Manuscript</span>
          </h1>
          <p className="text-xl text-muted-foreground font-sans max-w-2xl mx-auto">
            A premium, editorial experience where the AI&apos;s complex node graphs and narrative arcs feel like part of a cohesive, high-end cinematic production.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
          {/* Node Card Demonstration */}
          <div className="p-8 rounded-[1.5rem] bg-card border-none flex flex-col items-start text-left space-y-4">
            <div className="text-primary text-sm font-semibold tracking-widest uppercase">
              Phase 0 Complete
            </div>
            <h2 className="text-2xl font-heading font-medium">Design System Configured</h2>
            <p className="text-muted-foreground mb-4">
              Colors, typography, and dark-mode only theme toggle have been initiated according to the strict &quot;No-Line&quot; rules and layering principles.
            </p>
          </div>

          {/* Glassmorphism Panel Demonstration */}
          <div className="relative p-8 rounded-[1.5rem] bg-[#131316]/60 backdrop-blur-[12px] border-none flex flex-col justify-center items-center space-y-6">
             <div className="text-center space-y-2">
                 <h2 className="text-xl font-heading font-medium">Ready to Build</h2>
                 <p className="text-sm text-muted-foreground">Tailwind v4 mapped dynamically.</p>
             </div>
             <Button className="h-14 w-14 rounded-full bg-gradient-to-r from-primary to-[#69daff] text-black font-bold shadow-[0_0_32px_rgba(186,158,255,0.15)] flex items-center justify-center p-0">
               <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-right"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
             </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
