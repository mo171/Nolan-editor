"use client";

import React from "react";
import { motion } from "framer-motion";

const steps = [
  { num: "01", title: "Write", desc: "Input your manuscript or simple plot points in natural language." },
  { num: "02", title: "AI Extracts", desc: "The engine identifies entities, relationships, and thematic beats." },
  { num: "03", title: "Graph Builds", desc: "Your story structure is mapped into a dynamic, editable graph view." },
  { num: "04", title: "Generate", desc: "Create visual scenes based on your nodes with style control." },
  { num: "05", title: "Export", desc: "Publish your world to any digital medium or production pipeline." },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export function WorkflowSection() {
  return (
    <section id="planning" className="py-24 px-6 relative overflow-hidden bg-background">
      <div className="max-w-7xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col md:flex-row items-center justify-between mb-20"
        >
          <div className="max-w-md">
            <h2 className="font-heading text-4xl font-bold mb-4 text-foreground">The Workflow of Magic</h2>
            <p className="text-muted-foreground font-sans">Simple inputs. Complex outputs. Designed for creative velocity.</p>
          </div>
          <div className="h-px flex-1 bg-gradient-to-r from-primary/30 to-transparent mx-12 hidden md:block"></div>
        </motion.div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8"
        >
          {steps.map((step, idx) => (
            <motion.div key={idx} variants={itemVariants} className="relative group cursor-pointer hover:-translate-y-2 transition-transform duration-300">
              <div className="mb-6 w-14 h-14 rounded-2xl bg-[#25252a] flex items-center justify-center text-primary font-heading text-2xl font-bold group-hover:bg-primary group-hover:text-black transition-all">
                {step.num}
              </div>
              <h4 className="font-bold font-heading text-lg mb-2 text-foreground">{step.title}</h4>
              <p className="text-muted-foreground font-sans text-sm">{step.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
