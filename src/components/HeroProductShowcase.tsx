"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export default function HeroProductShowcase() {
  const [typedText, setTypedText] = useState("");
  const fullText = "Chapitre 1 : Les Fondations de l'Expertise. Pour transformer vos connaissances en un ouvrage mémorable, il convient d'abord de captiver l'attention de vos lecteurs dès les premières lignes...";

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      if (index <= fullText.length) {
        setTypedText(fullText.slice(0, index));
        index++;
      } else {
        setTimeout(() => {
          index = 0;
        }, 3000);
      }
    }, 40);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-6xl xl:max-w-7xl mx-auto mt-8 sm:mt-12 mb-6 relative px-2 sm:px-4">
      {/* Background Soft Glows */}
      <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-[95%] h-[320px] bg-gradient-to-r from-orange-300/20 via-amber-200/15 to-orange-400/20 blur-3xl rounded-full -z-10 pointer-events-none" />

      {/* Floating Animated Badge 1: Top Right (Non-overlapping) */}
      <motion.div 
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="hidden md:flex items-center gap-2 bg-white px-3.5 py-2 rounded-2xl border border-neutral-200 shadow-md absolute -top-5 right-6 z-20"
      >
        <div className="w-6 h-6 rounded-lg bg-orange-100 text-secondary flex items-center justify-center">
          <span className="material-symbols-outlined text-sm">verified</span>
        </div>
        <span className="text-xs font-bold text-neutral-800">Conforme Amazon KDP</span>
      </motion.div>

      {/* Floating Animated Badge 2: Bottom Left (Non-overlapping) */}
      <motion.div 
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="hidden md:flex items-center gap-2 bg-white px-3.5 py-2 rounded-2xl border border-neutral-200 shadow-md absolute -bottom-5 left-6 z-20"
      >
        <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
          <span className="material-symbols-outlined text-sm">bolt</span>
        </div>
        <span className="text-xs font-bold text-neutral-800">Génération 10x Rapide</span>
      </motion.div>

      {/* Main Floating App Showcase Window */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="bg-white rounded-2xl sm:rounded-3xl border border-neutral-200/90 shadow-[0_20px_50px_rgba(0,0,0,0.08)] overflow-hidden relative"
      >
        {/* App Header Bar */}
        <div className="bg-neutral-50 px-4 py-3 sm:px-6 sm:py-4 border-b border-neutral-200/80 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-400/80" />
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-amber-400/80" />
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-400/80" />
            </div>
            <span className="text-[11px] sm:text-xs font-semibold text-neutral-400 font-mono">
              iris-studio.app/editor
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-secondary"></span>
            </span>
            <span className="text-[10px] sm:text-xs font-bold text-neutral-700 uppercase tracking-wider">
              Co-Rédaction en Direct
            </span>
          </div>
        </div>

        {/* Outer Scroll Wrapper for Mobile Horizontal Stretch */}
        <div className="overflow-x-auto scrollbar-none">
          {/* Workspace Grid - STABLE HORIZONTAL SIDE-BY-SIDE LAYOUT */}
          <div className="p-4 sm:p-6 md:p-10 min-w-[580px] sm:min-w-0 grid grid-cols-12 gap-4 sm:gap-6 md:gap-8 items-stretch bg-gradient-to-b from-white to-orange-50/20">
            
            {/* Left Column: Book Preview Card */}
            <motion.div 
              whileHover={{ scale: 1.02, rotateY: 3 }}
              transition={{ duration: 0.3 }}
              className="col-span-5 md:col-span-4 bg-gradient-to-br from-neutral-900 via-neutral-800 to-black text-white p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-xl relative overflow-hidden group flex flex-col justify-between"
            >
              {/* Book Spine Edge Decor */}
              <div className="absolute top-0 left-0 w-2 sm:w-2.5 h-full bg-gradient-to-r from-orange-500 via-secondary to-amber-500" />

              <div className="relative z-10">
                <div className="inline-block bg-secondary text-white text-[9px] sm:text-[10px] font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md uppercase tracking-widest mb-2 sm:mb-4">
                  eBook HD
                </div>
                <h4 className="font-heading text-sm sm:text-xl md:text-2xl font-bold leading-tight mb-1 sm:mb-2">
                  Les Secrets de la FinTech
                </h4>
                <p className="text-[10px] sm:text-xs text-neutral-400">Par Jean-Marc K.</p>
              </div>

              <div className="relative z-10 pt-4 sm:pt-8 border-t border-white/10 flex items-center justify-between mt-4">
                <div>
                  <span className="text-[9px] sm:text-[10px] text-neutral-400 uppercase tracking-wider block">Progression</span>
                  <span className="font-heading font-extrabold text-sm sm:text-xl text-secondary">78%</span>
                </div>
                <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md">
                  <span className="material-symbols-outlined text-white text-sm sm:text-lg">auto_awesome</span>
                </div>
              </div>

              {/* Glowing inner shadow */}
              <div className="absolute -bottom-10 -right-10 w-28 h-28 sm:w-32 sm:h-32 bg-secondary/30 blur-2xl rounded-full pointer-events-none" />
            </motion.div>

            {/* Right Column: AI Live Typing Interface */}
            <div className="col-span-7 md:col-span-8 flex flex-col justify-between gap-4 sm:gap-6">
              
              {/* Prompt Bubble */}
              <div className="flex gap-2.5 sm:gap-3 items-start">
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold text-[10px] sm:text-xs shrink-0 mt-0.5">
                  Vous
                </div>
                <div className="bg-neutral-100 p-3 sm:p-4 rounded-xl sm:rounded-2xl rounded-tl-xs text-xs sm:text-sm text-neutral-800 font-medium leading-relaxed">
                  Iris, peux-tu structurer l&apos;introduction et lancer le premier chapitre avec un ton captivant ?
                </div>
              </div>

              {/* AI Response Box with FIXED HEIGHT */}
              <div className="flex gap-2.5 sm:gap-3 items-start">
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-secondary text-white flex items-center justify-center font-bold text-[10px] sm:text-xs shrink-0 shadow-sm mt-0.5">
                  Iris
                </div>
                <div className="bg-white border border-orange-200/80 p-3 sm:p-5 rounded-xl sm:rounded-2xl rounded-tl-xs text-xs sm:text-sm text-neutral-900 shadow-sm relative w-full">
                  <div className="flex items-center gap-1.5 mb-2 sm:mb-3 text-[10px] sm:text-xs font-bold text-secondary">
                    <span className="material-symbols-outlined text-xs sm:text-base">edit_note</span>
                    <span>Génération du chapitre...</span>
                  </div>
                  
                  {/* Fixed height container ensures 100% stable card dimensions during typing */}
                  <div className="h-[68px] sm:h-[84px] overflow-hidden">
                    <p className="leading-relaxed text-neutral-800 font-sans">
                      {typedText}
                      <span className="inline-block w-1.5 h-3.5 sm:w-1.5 sm:h-4 bg-secondary ml-1 animate-pulse" />
                    </p>
                  </div>
                </div>
              </div>

              {/* Bottom Live Action Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3 sm:pt-4 border-t border-neutral-200/60 text-xs font-semibold text-neutral-500">
                <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                  <span className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 text-xs">
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    124 pages formatées
                  </span>
                  <span className="flex items-center gap-1.5 text-neutral-700 text-xs">
                    <span className="material-symbols-outlined text-sm">speed</span>
                    Export PDF / EPUB prêt
                  </span>
                </div>

                <span className="text-secondary font-bold hover:underline cursor-pointer flex items-center gap-1 text-xs">
                  Voir l&apos;éditeur complet <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </span>
              </div>

            </div>

          </div>
        </div>

      </motion.div>

    </div>
  );
}
