"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Superposition animée affichée au-dessus du canevas de l'éditeur pendant que
 * l'IA écrit ou réécrit le livre. Objectif : montrer clairement à l'auteur que
 * son manuscrit est en train d'être rédigé, avec une animation soignée
 * (plume qui écrit, lignes de texte qui se remplissent, particules, barre de
 * progression indéterminée) — sans jamais bloquer le rendu du texte en dessous.
 */

const DEFAULT_MESSAGES = [
  "Iris prépare votre manuscrit…",
  "Rédaction des chapitres…",
  "Mise en forme des pages…",
  "Peaufinage du style et du rythme…",
];

export default function EditorGenerationOverlay({
  label = "Iris écrit votre livre",
  messages = DEFAULT_MESSAGES,
  progress,
  onStop,
}: {
  label?: string;
  messages?: string[];
  /** Progression réelle (chapitre courant / total) — affiche une barre déterminée. */
  progress?: { current: number; total: number } | null;
  /** Callback d'arrêt : affiche un bouton « Arrêter » (stop après le chapitre en cours). */
  onStop?: () => void;
}) {
  const pct =
    progress && progress.total > 0
      ? Math.min(100, Math.round((progress.current / progress.total) * 100))
      : null;
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setMsgIndex((i) => (i + 1) % messages.length);
    }, 2600);
    return () => clearInterval(id);
  }, [messages.length]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="absolute inset-0 z-40 flex items-center justify-center overflow-hidden bg-gradient-to-b from-white/85 via-white/75 to-[#F3F4F6]/85 backdrop-blur-[3px]"
      role="status"
      aria-live="polite"
    >
      {/* Halos animés en fond */}
      <div className="pointer-events-none absolute -top-24 -left-16 w-72 h-72 rounded-full bg-orange-200/40 blur-3xl animate-pulse-slow" />
      <div className="pointer-events-none absolute -bottom-24 -right-10 w-80 h-80 rounded-full bg-amber-200/40 blur-3xl animate-pulse-slower" />

      {/* Particules flottantes */}
      <div className="pointer-events-none absolute inset-0">
        <span className="absolute left-[18%] top-[28%] text-secondary/70 text-xl animate-float-sparkle-1">✦</span>
        <span className="absolute right-[22%] top-[36%] text-amber-400/70 text-base animate-float-sparkle-2">✦</span>
        <span className="absolute left-[30%] bottom-[26%] text-orange-300/70 text-lg animate-float-sparkle-3">✦</span>
        <span className="absolute right-[30%] bottom-[32%] text-secondary/60 text-sm animate-float-sparkle-1">✦</span>
      </div>

      {/* Carte centrale */}
      <motion.div
        initial={{ scale: 0.92, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 20 }}
        className="relative flex flex-col items-center gap-5 rounded-3xl border border-white/70 bg-white/80 px-8 py-8 shadow-2xl backdrop-blur-md max-w-[86vw] w-[360px]"
      >
        {/* Plume qui écrit sur une ligne */}
        <div className="relative w-44 h-20">
          <svg viewBox="0 0 200 90" className="w-full h-full overflow-visible">
            {/* Ligne d'écriture qui se dessine */}
            <motion.path
              d="M 20 62 C 60 40, 90 78, 120 58 S 170 44, 182 60"
              fill="none"
              stroke="#F95738"
              strokeWidth="2.5"
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0.2 }}
              animate={{ pathLength: [0, 1, 1], opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 2.4, ease: "easeInOut", repeat: Infinity }}
            />
            {/* Plume / stylo animé qui suit la ligne */}
            <motion.g
              initial={{ x: 0, y: 0 }}
              animate={{ x: [0, 60, 100, 162], y: [0, -12, 4, 0] }}
              transition={{ duration: 2.4, ease: "easeInOut", repeat: Infinity }}
              style={{ transformOrigin: "center" }}
            >
              <motion.g
                animate={{ rotate: [-6, 4, -6] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
              >
                {/* corps de la plume */}
                <path d="M 20 60 L 34 20 L 40 24 L 26 62 Z" fill="#111827" />
                <path d="M 24 54 L 34 30" stroke="#F95738" strokeWidth="1.6" strokeLinecap="round" />
                {/* pointe */}
                <circle cx="21" cy="61" r="2.4" fill="#F95738" />
              </motion.g>
            </motion.g>
          </svg>
        </div>

        {/* Lignes de texte simulées qui se remplissent */}
        <div className="w-full flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-2 rounded-full bg-neutral-200/70 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-secondary to-amber-400"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: [0, 1, 1, 0] }}
                style={{ transformOrigin: "left" }}
                transition={{
                  duration: 2.8,
                  times: [0, 0.5, 0.8, 1],
                  ease: "easeInOut",
                  repeat: Infinity,
                  delay: i * 0.35,
                }}
              />
            </div>
          ))}
        </div>

        {/* Titre + message rotatif */}
        <div className="flex flex-col items-center gap-1 text-center">
          <div className="flex items-center gap-2 font-heading font-extrabold text-neutral-900 text-base">
            <span className="material-symbols-outlined text-secondary text-lg animate-pulse">auto_awesome</span>
            <span>{label}</span>
            <span className="inline-flex w-5 justify-start">
              <AnimatedDots />
            </span>
          </div>
          <div className="h-5 relative w-full">
            <AnimatePresence mode="wait">
              <motion.p
                key={msgIndex}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.35 }}
                className="text-xs font-medium text-neutral-500 absolute inset-0"
              >
                {messages[msgIndex]}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>

        {/* Barre de progression : déterminée si on connaît l'avancement, sinon shimmer */}
        {pct != null ? (
          <div className="w-full space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-neutral-500">
              <span>Chapitre {progress!.current} / {progress!.total}</span>
              <span>{pct}%</span>
            </div>
            <div className="relative w-full h-2 rounded-full bg-neutral-200/70 overflow-hidden">
              <motion.div
                className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-secondary to-amber-400"
                initial={false}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
          </div>
        ) : (
          <div className="relative w-full h-1.5 rounded-full bg-neutral-200/70 overflow-hidden">
            <motion.div
              className="absolute top-0 h-full w-1/3 rounded-full bg-gradient-to-r from-transparent via-secondary to-transparent"
              initial={{ x: "-40%" }}
              animate={{ x: "340%" }}
              transition={{ duration: 1.4, ease: "easeInOut", repeat: Infinity }}
            />
          </div>
        )}

        {/* Bouton d'arrêt (stop après le chapitre en cours) */}
        {onStop && (
          <button
            onClick={onStop}
            className="mt-1 inline-flex items-center gap-1.5 rounded-xl border border-neutral-300 bg-white/80 px-4 py-2 text-xs font-bold text-neutral-700 hover:bg-white hover:border-red-300 hover:text-red-600 transition-colors"
          >
            <span className="material-symbols-outlined text-base">stop_circle</span>
            Arrêter
          </button>
        )}
      </motion.div>
    </motion.div>
  );
}

function AnimatedDots() {
  const [dots, setDots] = useState("");
  useEffect(() => {
    const id = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "" : d + "."));
    }, 400);
    return () => clearInterval(id);
  }, []);
  return <span className="text-secondary">{dots}</span>;
}
