"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, X, BookOpen } from "lucide-react";
import { useUser } from "@/hooks/useUser";

export default function WelcomeModal() {
  const router = useRouter();
  const { user, profile, loading, markWelcomeModalAsSeen, displayName } = useUser();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (loading || !user) return;

    // Check if user has already seen the welcome popup in profile or localStorage
    const localSeen = typeof window !== "undefined" 
      ? localStorage.getItem(iris_welcome_seen_) 
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
          className="relative w-full max-w-[340px] sm:max-w-sm bg-white rounded-2xl shadow-xl border border-neutral-100 overflow-hidden z-10 my-auto text-neutral-900"
          role="dialog"
          aria-modal="true"
        >
          {/* Top Decorative Ambient Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-20 bg-gradient-to-b from-orange-400/20 to-transparent rounded-full blur-2xl pointer-events-none" />

          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-500 hover:text-neutral-700 transition-colors z-20"
            aria-label="Fermer"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          <div className="p-4 sm:p-5 space-y-4 text-center">
            {/* Compact Animated Icon Badge */}
            <div className="relative mx-auto w-12 h-12 flex items-center justify-center pt-1">
              <motion.div
                animate={{ rotate: [0, 8, -8, 0], scale: [1, 1.06, 1] }}
                transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
                className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-400 p-[1.5px] shadow-md shadow-orange-500/15"
              >
                <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
                  <span className="text-2xl select-none">🎁</span>
                </div>
              </motion.div>
            </div>

            {/* Title & Greeting */}
            <div className="space-y-1">
              <h2 className="font-heading text-lg sm:text-xl font-bold tracking-tight text-neutral-900">
                Bienvenue sur Iris{displayName ?   : ""} !
              </h2>
              <p className="text-xs text-neutral-500">
                Votre studio de création littéraire avec l&apos;IA.
              </p>
            </div>

            {/* 500 Coins Gift Highlight Card - Sleek & Compact */}
            <div className="bg-gradient-to-br from-amber-50/90 to-orange-50/70 border border-amber-200/80 rounded-xl p-3 text-center space-y-1 shadow-2xs">
              <div className="flex items-center justify-center gap-1.5">
                <span className="text-xl">🪙</span>
                <span className="font-heading font-extrabold text-xl text-amber-950 tracking-tight">
                  +500 Pièces offertes
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-amber-800 leading-snug">
                Créditées sur votre compte pour lancer votre tout premier livre !
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              <button
                onClick={handleStartAdventure}
                className="w-full bg-gradient-to-r from-orange-500 to-secondary hover:from-orange-600 hover:to-secondary/90 text-white font-bold py-2.5 px-4 rounded-xl shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-1.5 group text-xs sm:text-sm"
              >
                <BookOpen className="w-4 h-4" />
                <span>Créer mon premier livre</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                onClick={handleClose}
                className="w-full text-neutral-500 hover:text-neutral-800 font-medium py-1 text-[11px] sm:text-xs transition-colors"
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
