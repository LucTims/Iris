"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface RewriteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRewrite: (instructions: string) => void;
}

export default function RewriteModal({ isOpen, onClose, onRewrite }: RewriteModalProps) {
  const [instructions, setInstructions] = useState("");

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 backdrop-blur-sm p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden flex flex-col"
        >
          <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500">
                <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
              </div>
              <div>
                <h2 className="font-bold text-neutral-800 text-lg">Réécrire le document</h2>
                <p className="text-xs text-neutral-500">L'IA va remplacer le texte actuel selon vos instructions.</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-100 text-neutral-500 transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          <div className="p-6">
            <label className="text-sm font-bold text-neutral-700 mb-2 block">
              Instructions de réécriture
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Ex: Rends le texte plus professionnel, ajoute de l'humour, développe plus l'introduction, corrige les fautes..."
              rows={4}
              className="w-full bg-neutral-50 border border-neutral-200 text-neutral-900 text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all resize-none"
            />
          </div>

          <div className="p-6 border-t border-neutral-100 bg-neutral-50 flex items-center gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl font-bold text-sm text-neutral-600 hover:bg-neutral-200 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={() => {
                onRewrite(instructions);
                setInstructions("");
                onClose();
              }}
              className="px-5 py-2.5 rounded-xl font-bold text-sm bg-secondary hover:bg-orange-600 text-white flex items-center gap-2 shadow-sm transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
              Lancer la réécriture
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
