import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 relative overflow-hidden bg-[#0e0e11]">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/15 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#69daff]/10 rounded-full blur-[120px]" />
      </div>

      {/* Header / Logo */}
      <div className="relative z-10 mb-8 mt-4">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-[#69daff] flex items-center justify-center text-black font-bold text-lg shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-all duration-300">
            N
          </div>
          <span className="text-2xl font-bold tracking-tight font-heading bg-gradient-to-r from-primary to-[#69daff] bg-clip-text text-transparent">
            Nolan AI Studio
          </span>
        </Link>
      </div>

      {/* Auth Card Content */}
      <div className="relative z-10 w-full max-w-[440px] perspective-1000">
        {children}
      </div>

      {/* Footer Links */}
      <div className="relative z-10 mt-8 text-center pb-6">
        <p className="text-xs font-semibold text-white/30 tracking-widest uppercase">
          The Cinematic Narrative Engine • Ethereal Manuscript
        </p>
      </div>
    </div>
  );
}
