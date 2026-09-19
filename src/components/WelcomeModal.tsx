"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, X, BookOpen, Sparkles, Coins } from "lucide-react";
import { useUser } from "@/hooks/useUser";

export default function WelcomeModal() {
  const router = useRouter();
  const { user, profile, loading, markWelcomeModalAsSeen, displayName } = useUser();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (loading || !user) return;

    // Check if user has already seen the welcome popup in profile or localStorage
    const localSeen = typeof window !== "undefined" 
      ? localStorage.getItem(`iris_welcome_seen_${user.id}`) 
      : null;

    const hasSeen = profile?.has_seen_welcome_modal || localSeen === "true";

    if (!hasSeen) {
      // Slight delay so the page loads nicely before popping up
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [user, profile, loading]);

  const handleClose = async () => {
    setIsOpen(false);
    if (markWelcomeModalAsSeen) {
      await markWelcomeModalAsSeen();
    }
  };

  const handleStartAdventure = async () => {
    setIsOpen(false);
    if (markWelcomeModalAsSeen) {
      await markWelcomeModalAsSeen();
    }
    router.push("/projects/new");
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-neutral-950/60 backdrop-blur-sm"
          onClick={handleClose}
        />

        {/* Modal Card - Compact */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 15 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="relative w-full max-w-[340px] sm:max-w-sm bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-100 dark:border-neutral-800 overflow-hidden z-10 my-auto text-neutral-900 dark:text-neutral-100"
          role="dialog"
          aria-modal="true"
        >
          {/* Top Decorative Ambient Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-20 bg-gradient-to-b from-orange-400/20 to-transparent rounded-full blur-2xl pointer-events-none" />

          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:text-neutral-300 transition-colors z-20"
            aria-label="Fermer"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          <div className="p-5 sm:p-6 space-y-4 text-center">
            {/* Compact Refined Icon Badge */}
            <div className="mx-auto w-11 h-11 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center text-neutral-800 dark:text-neutral-200">
              <Sparkles className="w-5 h-5 text-secondary" />
            </div>

            {/* Title & Greeting */}
            <div className="space-y-1">
              <h2 className="font-heading text-lg sm:text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                Bienvenue sur Iris{displayName ? ` ${displayName}` : ""}
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Votre studio de création et d&apos;édition littéraire.
              </p>
            </div>

            {/* 500 Coins Gift Highlight Card */}
            <div className="bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/80 dark:border-neutral-800 rounded-xl p-3.5 text-center space-y-1 shadow-2xs">
              <div className="flex items-center justify-center gap-2">
                <Coins className="w-5 h-5 text-secondary" />
                <span className="font-heading font-bold text-lg text-neutral-900 dark:text-neutral-100 tracking-tight">
                  500 crédits offerts
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-snug">
                Disponibles immédiatement pour démarrer votre premier ouvrage !
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              <button
                onClick={handleStartAdventure}
                className="w-full bg-[#C84B31] hover:bg-[#B83E26] text-white font-semibold py-2.5 px-4 rounded-xl shadow-2xs hover:shadow-xs transition-all flex items-center justify-center gap-2 group text-xs sm:text-sm cursor-pointer"
              >
                <BookOpen className="w-4 h-4" />
                <span>Créer mon premier livre</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                onClick={handleClose}
                className="w-full text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:text-neutral-200 font-medium py-1 text-xs transition-colors"
              >
                Explorer le tableau de bord
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
