"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

export function SplashLoader({ onComplete }) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    // Lock body scroll while loader is active
    document.body.style.overflow = "hidden";

    // Stage 1: Fade out non-target letters
    const t1 = setTimeout(() => setStage(1), 1800);

    // Stage 2: Morph Λ to X
    const t2 = setTimeout(() => setStage(2), 2400);

    // Stage 3: Zoom X
    const t3 = setTimeout(() => setStage(3), 3000);

    // Complete: Unmount loader
    const t4 = setTimeout(() => {
      document.body.style.overflow = "unset";
      onComplete();
    }, 3800);

    return () => {
      document.body.style.overflow = "unset";
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onComplete]);

  // General letter entrance variants
  const letterVariants = {
    initial: { opacity: 0, filter: "blur(10px)", y: 10 },
    enter: (i) => ({
      opacity: 1,
      filter: "blur(0px)",
      y: 0,
      transition: {
        duration: 0.8,
        delay: i * 0.1,
        ease: [0.25, 0.46, 0.45, 0.94], // Smooth ease out
      },
    }),
    fade: {
      opacity: 0,
      filter: "blur(10px)",
      scale: 0.9,
      transition: { duration: 0.5, ease: "easeInOut" },
    },
  };

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-white overflow-hidden pointer-events-none"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: "linear" }}
    >
      <div className="flex items-center text-black font-sans font-bold text-5xl md:text-7xl lg:text-8xl tracking-[0.2em]">
        <motion.span
          custom={0}
          variants={letterVariants}
          initial="initial"
          animate={stage >= 1 ? "fade" : "enter"}
        >
          R
        </motion.span>
        <motion.span
          custom={1}
          variants={letterVariants}
          initial="initial"
          animate={stage >= 1 ? "fade" : "enter"}
        >
          E
        </motion.span>

        {/* The morphing character */}
        <div className="relative flex items-center justify-center w-[1ch] mx-[0.1em]">
          <AnimatePresence mode="popLayout">
            {stage < 2 ? (
              <motion.span
                key="lambda"
                initial={{ opacity: 0, filter: "blur(10px)", y: 10 }}
                animate={{
                  opacity: 1,
                  filter: "blur(0px)",
                  y: 0,
                  transition: { duration: 0.8, delay: 0.2 },
                }}
                exit={{
                  opacity: 0,
                  rotateY: 90,
                  filter: "blur(10px)",
                  transition: { duration: 0.3, ease: "easeIn" },
                }}
                className="absolute font-light"
              >
                Λ
              </motion.span>
            ) : (
              <motion.span
                key="x"
                initial={{ opacity: 0, rotateY: -90, filter: "blur(10px)" }}
                animate={
                  stage === 3
                    ? {
                        opacity: 1,
                        rotateY: 0,
                        filter: "blur(0px)",
                        scale: 150, // Massive zoom
                        transition: {
                          scale: { duration: 0.8, ease: [0.65, 0, 0.35, 1] }, // Netflix style sudden acceleration
                          opacity: { duration: 0.1 },
                          rotateY: { duration: 0.3 },
                        },
                      }
                    : {
                        opacity: 1,
                        rotateY: 0,
                        filter: "blur(0px)",
                        scale: 1,
                        transition: { duration: 0.4, ease: "easeOut" },
                      }
                }
                className="absolute font-medium"
                style={{
                  transformOrigin: "center center",
                }}
              >
                X
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <motion.span
          custom={3}
          variants={letterVariants}
          initial="initial"
          animate={stage >= 1 ? "fade" : "enter"}
        >
          L
        </motion.span>
        <motion.span
          custom={4}
          variants={letterVariants}
          initial="initial"
          animate={stage >= 1 ? "fade" : "enter"}
        >
          M
        </motion.span>
        <motion.span
          custom={5}
          variants={letterVariants}
          initial="initial"
          animate={stage >= 1 ? "fade" : "enter"}
        >
          X
        </motion.span>
      </div>
    </motion.div>
  );
}
