"use client";

import React from "react";
import { motion } from "framer-motion";
import { Network, Clapperboard, Play } from "lucide-react";

export function VisualDemoSection() {
  return (
    <section className="py-24 px-6 bg-black">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="font-heading text-4xl font-bold mb-6 text-foreground">
              The Power of the <br /> 
              <span className="text-primary">Ethereal Manuscript</span>
            </h2>
            <div className="space-y-6">
              <div className="flex gap-4 p-4 rounded-xl hover:bg-white/5 hover:-translate-y-1 hover:shadow-[0_10px_20px_-10px_rgba(186,158,255,0.2)] transition-all cursor-pointer">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Network className="text-primary" size={24} />
                </div>
                <div>
                  <h4 className="font-bold font-heading text-lg mb-1 text-foreground">Graph-Driven Narratives</h4>
                  <p className="text-muted-foreground font-sans text-sm">
                    Visualize your story arcs as a live node system where causality and character choices drive the plot automatically.
                  </p>
                </div>
              </div>
              <div className="flex gap-4 p-4 rounded-xl hover:bg-white/5 hover:-translate-y-1 hover:shadow-[0_10px_20px_-10px_rgba(105,218,255,0.2)] transition-all cursor-pointer">
                <div className="w-12 h-12 rounded-lg bg-[#69daff]/10 flex items-center justify-center flex-shrink-0">
                  <Clapperboard className="text-[#69daff]" size={24} />
                </div>
                <div>
                  <h4 className="font-bold font-heading text-lg mb-1 text-foreground">Cinematic Output</h4>
                  <p className="text-muted-foreground font-sans text-sm">
                    Generate high-fidelity panels, storyboards, and character visuals that maintain consistent art style across every chapter.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="relative aspect-video bg-[#131316]/60 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden shadow-inner group hover:shadow-[0_0_40px_rgba(186,158,255,0.15)] hover:border-white/20 transition-all duration-500"
          >
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/20 transition-all z-10">
              <div className="w-20 h-20 rounded-full bg-primary/80 backdrop-blur-md flex items-center justify-center text-white cursor-pointer hover:scale-110 transition-transform">
                <Play className="fill-white ml-2" size={32} />
              </div>
            </div>
            <img 
              alt="Cinematic Demo" 
              className="w-full h-full object-cover" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDwGFfVt-5oudcX8r0Aro2ItOmpIafAKN8vguX0nuvCannF6WZAu1qof9lIKqftYWldLFfIOCK9sH7Yyho8bibM1_o33W6HLAmyeE24NWJBqX296L8TFjLyLW717Q5tjuRJelrJoYi2dK_1-xD0LdWv2f5XUcZvMP4doBuYBPW8oE7Uglz1tppoln27lnv1lszSsIwr-P4WFluw8vbaPzwRqqeh1TbjNyq1mr-9PFa_xHJzbRUHAdsg5FLhr_I0eZ4TilzQzDOplEI" 
            />
          </motion.div>

        </div>
      </div>
    </section>
  );
}
