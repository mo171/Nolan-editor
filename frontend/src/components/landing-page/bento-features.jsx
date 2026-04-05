"use client";

import React from "react";
import { motion } from "framer-motion";
import { Share2, Wand2, Focus } from "lucide-react";

export function BentoFeatures() {
  return (
    <section id="thinking" className="py-24 px-6 bg-background">
      <div className="max-w-7xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4 text-foreground">Core Engine Capabilities</h2>
          <p className="text-muted-foreground font-sans">Sophisticated tools for the modern digital scribe.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-auto md:h-[600px]">
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="md:col-span-2 bg-[#131316] rounded-[2rem] p-8 border border-white/5 flex flex-col justify-between group overflow-hidden relative hover:border-white/10 hover:shadow-[0_0_40px_-10px_rgba(186,158,255,0.1)] transition-all duration-500 hover:-translate-y-1"
          >
            <div className="relative z-10">
              <Share2 className="text-primary mb-4" size={36} />
              <h3 className="font-heading text-2xl font-bold mb-2 text-foreground">Narrative Graph Intelligence</h3>
              <p className="text-muted-foreground max-w-sm font-sans">
                Our AI analyzes your prose to build a live relational graph of events, locations, and lore in real-time.
              </p>
            </div>
            <div className="absolute -bottom-10 -right-10 w-2/3 opacity-30 group-hover:opacity-60 transition-opacity">
              <img 
                className="rounded-xl" 
                alt="Graph Network" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuA4uhalBYhC9KiGBzfWcvVbtj8DqAzWnNDa5-S3UNpSmxKP_YXRikIOFooDIwq9mL241V2PgLOkh4_STz0EG94h_EIhBlaoPG2YgQ8NKsHEKt9qJwP8k4aBjHGnTQdIhpN5QiVVYw2ZuP8560WxuNMxXwofv6SKtCTNQjoVsH8ZGCc6uBgihdCWMv-m9l_ygXqwwyPvGFyDr_B-bq-ANpcuclzZcshaK6d_l1sTgWp5K_p79Y3RTn4Yjyncm2gC2xs_KFh6r-Szd6g" 
              />
            </div>
          </motion.div>

          {/* Character Tracking */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="bg-[#25252a] rounded-[2rem] p-8 border border-white/10 flex flex-col items-center text-center justify-center space-y-6 hover:border-white/20 hover:bg-[#2a2a30] transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl"
          >
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-primary to-[#69daff] p-1">
              <div className="w-full h-full rounded-full bg-[#25252a] flex items-center justify-center">
                <Focus className="text-white" size={32} />
              </div>
            </div>
            <div>
              <h3 className="font-heading text-xl font-bold mb-2 text-foreground">Infinite Character Tracking</h3>
              <p className="text-muted-foreground text-sm font-sans">
                Maintain flawless visual and personality consistency for hundreds of unique actors within your world.
              </p>
            </div>
          </motion.div>

          {/* AI Scene */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="bg-[#131316] rounded-[2rem] p-8 border border-white/5 flex flex-col justify-end group hover:border-white/10 hover:shadow-[0_0_40px_-10px_rgba(105,218,255,0.1)] transition-all duration-500 hover:-translate-y-1"
          >
            <div className="mb-4">
              <Wand2 className="text-[#69daff] mb-4" size={36} />
              <h3 className="font-heading text-xl font-bold mb-2 text-foreground">AI Scene Generation</h3>
              <p className="text-muted-foreground text-sm font-sans">
                One click to turn dialogue into a fully realized cinematic scene with lighting and composition control.
              </p>
            </div>
          </motion.div>

          {/* Export */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="md:col-span-2 bg-gradient-to-br from-[#131316] to-[#1f1f23] rounded-[2rem] p-8 border border-white/5 flex items-center gap-8 overflow-hidden group hover:border-white/10 hover:shadow-2xl transition-all duration-500 hover:-translate-y-1"
          >
            <div className="flex-1">
              <h3 className="font-heading text-2xl font-bold mb-2 text-foreground">Production-Ready Export</h3>
              <p className="text-muted-foreground mb-6 font-sans">
                Direct visual export to Unreal Engine, Unity, or standard high-res image formats for immediate publication.
              </p>
              <div className="flex gap-3">
                <div className="px-3 py-1 bg-white/5 rounded-md text-xs font-sans uppercase">PNG / TIFF</div>
                <div className="px-3 py-1 bg-white/5 rounded-md text-xs font-sans uppercase">FBX / OBJ</div>
                <div className="px-3 py-1 bg-white/5 rounded-md text-xs font-sans uppercase">USDZ</div>
              </div>
            </div>
            <div className="hidden sm:block w-1/2 rotate-12 translate-x-10 translate-y-10 group-hover:rotate-6 transition-transform">
              <img 
                className="rounded-xl shadow-2xl" 
                alt="Storage Drive" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDLW5ZQDvo_0oWCj8Lpeqz6Jyke_SqiC1YpLPAGDC07YgetsnnCX3JO8u5hfSNfs3LlYSlgjqk54iFTKCiPoFpyZNOfogTizyW_SAvoGdJpRFUNFfPfE4xjErRyMVHXl5eCMT5CyxwNwXWmarFAHI7nhXnnEfVqa2i7C8gSkg67U8WdZV0Pe8LSzABBlX24ULb01j_BOLBU87jqF4QZP-VWQSyKfKKdj60waHi7cUoapSnUmPWwC1GNg2DpRV6UPjzpWQvnii_hc7E" 
              />
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
