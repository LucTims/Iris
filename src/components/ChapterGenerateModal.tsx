"use client";

import { useState } from "react";
import { BOOK_MODELS } from "@/lib/book/generationPresets";

const LS_MODEL = "iris_book_gen_model";

export type ChapterIntent = "rewrite" | "enrich" | "fix" | "shorten" | "custom";

export interface ChapterGenerateOptions {
  intent: ChapterIntent;
  instructions: string;
  model: string;
}

interface ChapterGenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (opts: ChapterGenerateOptions) => void;
  /** Titre du chapitre concerné (affiché dans l'en-tête). */
  chapterTitle: string;
  /** true si le chapitre a déjà du contenu → on parle de « modifier », sinon « rédiger ». */
  hasContent: boolean;
  defaultModel?: string;
}

/** Intentions rapides proposées à l'auteur (chacune pré-remplit une consigne de base). */
const INTENTS: { id: ChapterIntent; label: string; icon: string; hint: string; needsContent: boolean }[] = [
  { id: "rewrite", label: "Réécrire entièrement", icon: "restart_alt", hint: "Repartir de zéro sur ce chapitre", needsContent: false },
  { id: "enrich", label: "Enrichir / développer", icon: "add_notes", hint: "Plus de détails, d'exemples, de données", needsContent: true },
  { id: "fix", label: "Corriger & améliorer", icon: "spellcheck", hint: "Style, clarté et fautes, sans changer le fond", needsContent: true },
  { id: "shorten", label: "Raccourcir", icon: "compress", hint: "Aller à l'essentiel, plus concis", needsContent: true },
  { id: "custom", label: "Instruction libre", icon: "edit", hint: "Décrivez précisément ce que vous voulez", needsContent: false },
];

/**
 * Popup « Générer le chapitre » : demande à l'auteur COMMENT il veut (ré)écrire
 * le chapitre courant (intention rapide + consignes libres + modèle). N'agit que
 * sur ce chapitre — le reste du livre n'est pas touché.
 */
export default function ChapterGenerateModal({
  isOpen,
  onClose,
  onConfirm,
  chapterTitle,
  hasContent,
  defaultModel = "gemini-2.5-flash",
}: ChapterGenerateModalProps) {
  const [intent, setIntent] = useState<ChapterIntent>(hasContent ? "enrich" : "rewrite");
  const [instructions, setInstructions] = useState("");
  const [model, setModel] = useState(() => {
    if (typeof window === "undefined") return defaultModel;
    try {
      return localStorage.getItem(LS_MODEL) || defaultModel;
    } catch {
      return defaultModel;
    }
  });

  if (!isOpen) return null;

  // Sur un chapitre vide, seules les intentions qui n'ont pas besoin de contenu
  // existant ont du sens (on ne peut pas « enrichir » du vide).
  const intents = INTENTS.filter((i) => hasContent || !i.needsContent);

  const confirm = () => {
    try {
      localStorage.setItem(LS_MODEL, model);
    } catch {
      /* ignore */
    }
    onConfirm({ intent, instructions: instructions.trim(), model });
  };

  const canConfirm = intent !== "custom" || instructions.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-neutral-900/50 backdrop-blur-xs p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl border border-neutral-100 max-h-[92dvh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-neutral-100 sticky top-0 bg-white z-10">
          <div className="min-w-0">
            <h3 className="font-heading font-extrabold text-base sm:text-lg text-neutral-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">auto_fix_high</span>
              {hasContent ? "Modifier ce chapitre" : "Rédiger ce chapitre"}
            </h3>
            <p className="text-xs text-neutral-500 truncate mt-0.5 pl-8">{chapterTitle}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="px-5 sm:px-6 py-5 space-y-6">
          {/* Contexte */}
          <div className="p-3 rounded-xl bg-orange-50 border border-orange-100 flex items-start gap-2">
            <span className="material-symbols-outlined text-secondary text-lg">info</span>
            <p className="text-xs text-orange-900 leading-snug">
              L'IA ne modifiera que <strong>ce chapitre</strong>. Le reste du livre reste intact. Cette action consomme des pièces.
            </p>
          </div>

          {/* Intention */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-neutral-800">Que voulez-vous faire ?</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {intents.map((i) => {
                const active = intent === i.id;
                return (
                  <button
                    key={i.id}
                    type="button"
                    onClick={() => setIntent(i.id)}
                    className={`text-left p-3 rounded-xl border-2 transition-all flex items-start gap-2.5 ${
                      active ? "border-secondary bg-orange-50/60" : "border-neutral-200 bg-white hover:border-neutral-300"
                    }`}
                  >
                    <span className={`material-symbols-outlined text-lg ${active ? "text-secondary" : "text-neutral-400"}`}>{i.icon}</span>
                    <span className="min-w-0">
                      <span className={`block text-sm font-extrabold ${active ? "text-secondary" : "text-neutral-800"}`}>{i.label}</span>
                      <span className="block text-[11px] text-neutral-400 leading-snug">{i.hint}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Consignes libres */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-neutral-800">
              Précisions {intent === "custom" ? "" : <span className="font-medium text-neutral-400">(facultatif)</span>}
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={3}
              placeholder={
                intent === "custom"
                  ? "Ex : Ajoute une étude de cas sur la BRVM et un tableau comparatif des courtiers."
                  : "Ex : adopte un ton plus direct, ajoute des exemples concrets, cite des chiffres récents…"
              }
              className="w-full text-sm border border-neutral-200 rounded-xl px-3 py-2.5 outline-none focus:border-secondary resize-y placeholder:text-neutral-300"
            />
          </div>

          {/* Modèle */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-neutral-800">Modèle d'écriture</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {BOOK_MODELS.map((m) => {
                const active = model === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setModel(m.id)}
                    className={`text-left p-3 rounded-xl border-2 transition-all ${
                      active ? "border-secondary bg-orange-50/60" : "border-neutral-200 bg-white hover:border-neutral-300"
                    }`}
                  >
                    <span className={`text-sm font-bold ${active ? "text-secondary" : "text-neutral-800"}`}>{m.label}</span>
                    <p className="text-[11px] text-neutral-400 leading-snug">{m.hint}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-4 border-t border-neutral-100 flex items-center justify-end gap-2 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-xs font-bold text-neutral-600 hover:bg-neutral-100 transition-colors">
            Annuler
          </button>
          <button
            onClick={confirm}
            disabled={!canConfirm}
            className="bg-secondary hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 transition-colors"
          >
            <span className="material-symbols-outlined text-base">auto_awesome</span>
            {hasContent ? "Modifier le chapitre" : "Rédiger le chapitre"}
          </button>
        </div>
      </div>
    </div>
  );
}
