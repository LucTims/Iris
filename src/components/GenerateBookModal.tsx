"use client";

import { useState } from "react";
import { SIZE_PRESETS, BOOK_MODELS, estimatePagesCoins } from "@/lib/book/generationPresets";
import { WORDS_PER_PAGE } from "@/lib/ai/pricing";
import type { BookSizeKey } from "@/lib/book/generationPresets";

const LS_SIZE = "iris_book_gen_size";
const LS_MODEL = "iris_book_gen_model";
const fmt = (n: number) => Math.round(n).toLocaleString("fr-FR");

interface GenerateBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (opts: { sizeKey: BookSizeKey; model: string }) => void;
  defaultModel?: string;
  /** Nombre de chapitres détecté dans le sommaire (null si aucun sommaire). */
  sommaireChapters: number | null;
  /** Solde de pièces de l'utilisateur (pour le contrôle avant lancement). */
  balance?: number;
}

/**
 * Popup de lancement de « Générer tout le livre » : choix de la longueur
 * approximative (intervalle de pages) et du modèle. Entièrement responsive.
 */
export default function GenerateBookModal({
  isOpen,
  onClose,
  onConfirm,
  defaultModel = "gemini-2.5-flash",
  sommaireChapters,
  balance,
}: GenerateBookModalProps) {
  // Mémorise le dernier choix (longueur + modèle) entre deux ouvertures.
  const [sizeKey, setSizeKey] = useState<BookSizeKey>(() => {
    if (typeof window === "undefined") return "moyen";
    try {
      const s = localStorage.getItem(LS_SIZE);
      if (s && s in SIZE_PRESETS) return s as BookSizeKey;
    } catch {
      /* ignore */
    }
    return "moyen";
  });
  const [model, setModel] = useState(() => {
    if (typeof window === "undefined") return defaultModel;
    try {
      return localStorage.getItem(LS_MODEL) || defaultModel;
    } catch {
      return defaultModel;
    }
  });

  if (!isOpen) return null;

  const confirm = () => {
    try {
      localStorage.setItem(LS_SIZE, sizeKey);
      localStorage.setItem(LS_MODEL, model);
    } catch {
      /* ignore */
    }
    onConfirm({ sizeKey, model });
  };

  const preset = SIZE_PRESETS[sizeKey];
  const hasSommaire = sommaireChapters != null && sommaireChapters > 0;
  const estimatedChapters = hasSommaire ? (sommaireChapters as number) : preset.chaptersIfNoSommaire;

  // Nombre de pages estimé → devis EXACT (pages × tarif/page) par modèle.
  const pages = hasSommaire
    ? Math.max(1, Math.round((sommaireChapters as number) * preset.wordsPerChapter / WORDS_PER_PAGE))
    : preset.pagesEstimate;
  const devis = BOOK_MODELS.map((m) => ({ ...m, coins: estimatePagesCoins(pages, m.id) }));
  const selectedCost = estimatePagesCoins(pages, model);
  const hasBalance = typeof balance === "number";
  const insufficient = hasBalance && (balance as number) < selectedCost;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-neutral-900/50 backdrop-blur-xs p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl border border-neutral-100 max-h-[92dvh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-neutral-100 sticky top-0 bg-white z-10">
          <h3 className="font-heading font-extrabold text-base sm:text-lg text-neutral-900 flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">auto_stories</span>
            Générer tout le livre
          </h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="px-5 sm:px-6 py-5 space-y-6">
          {/* Contexte */}
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 flex items-start gap-2">
            <span className="material-symbols-outlined text-blue-500 text-lg">info</span>
            <p className="text-xs text-blue-800 leading-snug">
              {hasSommaire
                ? `Iris va rédiger les ${sommaireChapters} chapitres de votre sommaire, un par un.`
                : "Aucun sommaire détecté : Iris va d'abord proposer une structure, puis rédiger chaque chapitre."}{" "}
              Les chapitres existants seront remplacés. Cette action consomme des pièces.
            </p>
          </div>

          {/* Longueur */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-neutral-800">Longueur du livre (approximative)</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(Object.keys(SIZE_PRESETS) as BookSizeKey[]).map((k) => {
                const p = SIZE_PRESETS[k];
                const active = sizeKey === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setSizeKey(k)}
                    className={`text-left p-3 rounded-xl border-2 transition-all ${
                      active ? "border-secondary bg-orange-50/60" : "border-neutral-200 bg-white hover:border-neutral-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-extrabold ${active ? "text-secondary" : "text-neutral-800"}`}>{p.label}</span>
                      <span className={`w-3.5 h-3.5 rounded-full border ${active ? "border-secondary" : "border-neutral-300"} flex items-center justify-center`}>
                        {active && <span className="w-1.5 h-1.5 rounded-full bg-secondary" />}
                      </span>
                    </div>
                    <p className="text-[11px] font-bold text-neutral-500 mt-0.5">{p.pages}</p>
                    <p className="text-[11px] text-neutral-400 leading-snug">{p.desc}</p>
                  </button>
                );
              })}
            </div>
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

          {/* Devis : coût de la rédaction totale, par modèle */}
          <div className="rounded-2xl border border-neutral-200 overflow-hidden">
            <div className="px-4 py-2.5 bg-neutral-50 border-b border-neutral-100 flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-700">Coût estimé pour la rédaction totale</span>
              <span className="text-[11px] text-neutral-400 font-medium">~ {pages} pages</span>
            </div>
            <div className="divide-y divide-neutral-50">
              {devis.map((m) => {
                const active = model === m.id;
                return (
                  <div key={m.id} className={`flex items-center justify-between px-4 py-2.5 ${active ? "bg-orange-50/50" : ""}`}>
                    <span className="flex items-center gap-2 text-xs">
                      <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-secondary" : "bg-neutral-300"}`} />
                      <span className={`font-bold ${active ? "text-secondary" : "text-neutral-700"}`}>{m.label}</span>
                      <span className="text-neutral-400">{m.hint.replace(/^.*—\s*/, "")}</span>
                    </span>
                    <span className={`text-sm font-extrabold ${active ? "text-neutral-900" : "text-neutral-600"}`}>🪙 {fmt(m.coins)}</span>
                  </div>
                );
              })}
            </div>
            {hasBalance && (
              <div className={`px-4 py-2.5 text-xs font-bold flex items-center justify-between ${insufficient ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
                <span>Votre solde : {fmt(balance as number)} pièces</span>
                <span>{insufficient ? `Il vous manque ${fmt(selectedCost - (balance as number))}` : "Solde suffisant ✓"}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-4 border-t border-neutral-100 flex items-center justify-end gap-2 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-xs font-bold text-neutral-600 hover:bg-neutral-100 transition-colors">
            Annuler
          </button>
          <button
            onClick={confirm}
            disabled={insufficient}
            title={insufficient ? "Solde insuffisant pour ce modèle — choisissez un modèle moins cher ou rechargez." : undefined}
            className="bg-secondary hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 transition-colors"
          >
            <span className="material-symbols-outlined text-base">auto_awesome</span>
            {insufficient ? "Solde insuffisant" : "Lancer la génération"}
          </button>
        </div>
      </div>
    </div>
  );
}
