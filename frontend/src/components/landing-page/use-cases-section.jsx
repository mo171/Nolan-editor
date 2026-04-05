"use client";

import React from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const useCases = [
  {
    title: "Writers",
    desc: "Organize complex novels and series lore. Never lose track of a character arc again.",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuA-S89emk0xhkBGvFZcRaTbVL7GMRB65hzQDXtmSI4HIOnv_0ImN-8B-Z1Pi622sTynsMGr_fOwkZcc5EVqd72j1Ceq5UfNVVZ4PCa2WlRoSg4kNGpEJg0ClA--ChKHJ0DGe5SyRv2ZA5FcAyV4jZd4RRzHRqZgRKCajfwgAqIsM_9tuUeP0PkfzBcfjQ9-QBmq6Yd-76ko9PHvbJAD-poRLThKFDSOWng4ZyfkW18HyNCl5jzdJGbBDDJLNhedLet1qvinqpQkbJo",
  },
  {
    title: "Game Devs",
    desc: "Build branching narratives and export dialogue trees directly to your game engine.",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuAQEkOO0OiFD5K-Emxi0o19dW_IXD-YwF_T63VuILwOSpn8zbOMk7xwzhP0q12AbAH2Y30v9NFchpgL_QJxN35avCnS9X9RYYkxZnZqyI_SxSl0_ih_OgkPN3d5ZjRqAlqjFL3Z2AaJukAyy2w6aMlDZJ_SZhrBsGVO7QRJWYicj2jwUwheLtn6n5-NzmE7MgVAKSAF2Cj1neNlZ344QKctAx-0qB8E1Hdl9MbmEJhFsjkgNzelMoNrXey-FqcA5PbwLRVaFHKrdwk",
  },
  {
    title: "Scriptwriters",
    desc: "Turn screenplays into rich storyboards and conceptual pre-visualizations in minutes.",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuAdcIpJDja2I2Q_ZdC0bileAl9CPF8oS9knpCeqphAkqyjkPhwZd_QNFb9WpMP-NO0BXrSUBTBPk7gIbHVXyJBLzH-AmgaoHCvQ1J0B7_6yWh5ts-jFK012PPCSuvnoiU817RUMvjR2jkTx-hgMmIjq8KDB_RI8gTTxo8eQpHyX1jjJ8h8P_v6Fuv0laI6i9shmDgXz5FeW7GO0dMihp-4-RudoYGBSLlWLM5SlQHNv5eGA0qahCstDC-YAlMPCYOF7XFmKgRu0DoA",
  }
];

export function UseCases() {
  return (
    <section className="py-24 px-6 bg-[#131316]/30">
      <div className="max-w-7xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-heading text-3xl font-bold mb-4 text-foreground">Crafted for Visionaries</h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {useCases.map((uc, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="p-8 rounded-3xl bg-[#25252a]/50 border border-white/5 hover:border-primary/50 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:bg-[#2a2a30]/50 group cursor-pointer"
            >
              <img 
                className="w-full h-48 object-cover rounded-2xl mb-6 grayscale group-hover:grayscale-0 transition-all" 
                alt={uc.title} 
                src={uc.img} 
              />
              <h3 className="font-heading text-xl font-bold mb-3 text-foreground">{uc.title}</h3>
              <p className="text-muted-foreground font-sans text-sm mb-4">{uc.desc}</p>
              <a className="text-primary font-sans text-xs font-bold tracking-widest uppercase flex items-center gap-2 cursor-pointer" href="#">
                Learn More <ArrowRight size={14} />
              </a>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
