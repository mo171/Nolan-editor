"use client";

import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function FinalCTA() {
  return (
    <section className="py-24 px-6 text-center bg-background">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="max-w-4xl mx-auto rounded-[3rem] p-16 bg-gradient-to-br from-[#8455ee] to-[#00c0ea] relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-black/20 backdrop-blur-3xl"></div>
        <div className="relative z-10">
          <h2 className="font-heading text-4xl md:text-5xl font-extrabold text-white mb-6">
            Ready to start your manuscript?
          </h2>
          <p className="text-white/80 font-sans text-lg mb-10 max-w-xl mx-auto">
            Join thousands of creators building the next generation of narrative experiences.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/signup">
              <Button className="bg-white text-[#2b006e] px-10 h-14 rounded-full font-bold text-lg hover:bg-white transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.3)] border-none">
                Get Started Free
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" className="bg-black/20 text-white px-10 h-14 rounded-full font-bold text-lg border border-white/20 hover:bg-black/40 hover:text-white transition-all hover:scale-105 active:scale-95 shadow-xl">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
