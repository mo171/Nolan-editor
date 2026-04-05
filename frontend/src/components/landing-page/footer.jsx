import React from "react";
import { Globe, AtSign, MessageSquare } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-black border-t border-white/5 py-16 px-6">
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-12">
        <div className="col-span-2 md:col-span-1">
          <span className="text-xl font-bold font-heading bg-gradient-to-r from-[#ba9eff] to-[#69daff] bg-clip-text text-transparent">
            Ethereal Studio
          </span>
          <p className="mt-4 text-sm font-sans text-muted-foreground leading-relaxed">
            Defining the next era of cinematic storytelling through the power of structured narrative AI.
          </p>
        </div>
        <div>
          <h5 className="font-bold font-heading text-sm mb-6 uppercase tracking-wider text-foreground">Product</h5>
          <ul className="space-y-4 font-sans text-muted-foreground text-sm">
            <li><a className="hover:text-primary transition-colors" href="#">Creative Editor</a></li>
            <li><a className="hover:text-primary transition-colors" href="#">Graph Engine</a></li>
            <li><a className="hover:text-primary transition-colors" href="#">API Docs</a></li>
            <li><a className="hover:text-primary transition-colors" href="#">Pricing</a></li>
          </ul>
        </div>
        <div>
          <h5 className="font-bold font-heading text-sm mb-6 uppercase tracking-wider text-foreground">Resources</h5>
          <ul className="space-y-4 font-sans text-muted-foreground text-sm">
            <li><a className="hover:text-primary transition-colors" href="#">Lore Book</a></li>
            <li><a className="hover:text-primary transition-colors" href="#">Community</a></li>
            <li><a className="hover:text-primary transition-colors" href="#">Tutorials</a></li>
            <li><a className="hover:text-primary transition-colors" href="#">Status</a></li>
          </ul>
        </div>
        <div>
          <h5 className="font-bold font-heading text-sm mb-6 uppercase tracking-wider text-foreground">Connect</h5>
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-primary/20 cursor-pointer transition-all text-muted-foreground hover:text-primary">
              <Globe size={20} />
            </div>
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-primary/20 cursor-pointer transition-all text-muted-foreground hover:text-primary">
              <AtSign size={20} />
            </div>
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-primary/20 cursor-pointer transition-all text-muted-foreground hover:text-primary">
              <MessageSquare size={20} />
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-sans text-muted-foreground uppercase tracking-widest">
        <p>© 2026 Ethereal Studio. All rights reserved.</p>
        <div className="flex gap-8">
          <a className="hover:text-white transition-colors" href="#">Privacy Policy</a>
          <a className="hover:text-white transition-colors" href="#">Terms of Service</a>
        </div>
      </div>
    </footer>
  );
}
