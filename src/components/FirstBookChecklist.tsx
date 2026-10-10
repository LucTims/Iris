"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Coins, X } from "lucide-react";
import { WELCOME_COINS } from "@/lib/ai/pricing";
import {
  computeFirstBookProgress,
  welcomeChaptersCovered,
  type FirstBookProject,
} from "@/lib/onboarding/firstBook";

const dismissKey = (userId: string) => `iris_first_book_dismissed_${userId}`;

function readDismissed(userId: string): boolean {
  try {
    return typeof window !== "undefined" && window.localStorage.getItem(dismissKey(userId)) === "true";
  } catch {
    return false;
  }
}

interface FirstBookChecklistProps {
  userId: string;
  projects: FirstBookProject[];
  walletBalance: number | null;
}

/**
 * Carte « Mon premier livre » du tableau de bord : 4 étapes dont l'état est
 * déduit des projets réels (voir lib/onboarding/firstBook). Affichée tant que
 * le parcours n'est pas terminé ni masqué par l'auteur.
 */
export default function FirstBookChecklist({ userId, projects, walletBalance }: FirstBookChecklistProps) {
  // Monté uniquement côté client, une fois l'utilisateur connu : la lecture
  // initiale du localStorage ne crée donc pas d'écart d'hydratation.
  const [dismissed, setDismissed] = useState(() => readDismissed(userId));

  const progress = computeFirstBookProgress(projects);
  if (dismissed || progress.isComplete) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(dismissKey(userId), "true");
    } catch {
      /* stockage indisponible : masqué pour cette visite seulement */
    }
  };

  const remainingCoins = progress.steps
    .filter((s) => !s.done && typeof s.maxCoins === "number")
    .reduce((sum, s) => sum + (s.maxCoins || 0), 0);
  const chaptersCovered = welcomeChaptersCovered();
  const planDone = progress.steps.find((s) => s.id === "plan")?.done ?? false;

  let coinMessage: string;
  if (walletBalance === null) {
    coinMessage = "Chargement de votre solde…";
  } else if (!planDone && walletBalance >= WELCOME_COINS) {
    coinMessage = `Vos ${WELCOME_COINS.toLocaleString("fr-FR")} pièces offertes couvrent le plan et vos ${chaptersCovered} premiers chapitres.`;
  } else if (walletBalance >= remainingCoins) {
    coinMessage = "Votre solde couvre les prochaines étapes de votre livre.";
  } else {
    coinMessage = `Il vous manque environ ${(remainingCoins - walletBalance).toLocaleString("fr-FR")} pièces pour terminer ce parcours.`;
  }
  const lowBalance = walletBalance !== null && walletBalance < remainingCoins;

  const nextStepIndex = progress.steps.findIndex((s) => !s.done);

  return (
    <section
      aria-labelledby="first-book-title"
      className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-2xs p-4 sm:p-6 space-y-5"
    >
      {/* En-tête */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5 min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#C84B31]">Parcours guidé</p>
          <h2 id="first-book-title" className="font-heading font-bold text-lg text-neutral-900 dark:text-neutral-100">
            Mon premier livre
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {progress.completed} étape{progress.completed > 1 ? "s" : ""} sur {progress.total} terminée
            {progress.completed > 1 ? "s" : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Masquer le parcours « Mon premier livre »"
          title="Masquer"
          className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C84B31]/50"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Barre de progression */}
      <div
        role="progressbar"
        aria-label="Avancement du parcours"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress.percent}
        className="h-2 w-full rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden"
      >
        <div
          className="h-full rounded-full bg-[#C84B31] transition-all duration-500"
          style={{ width: `${Math.max(progress.percent, 4)}%` }}
        />
      </div>

      {/* Solde & réassurance */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/80 dark:border-neutral-800 rounded-xl p-3">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-[#C84B31]/10 flex items-center justify-center text-[#C84B31]">
            <Coins className="w-4 h-4" aria-hidden="true" />
          </div>
          <span className="font-heading font-bold text-sm text-neutral-900 dark:text-neutral-100">
            {walletBalance !== null ? `${walletBalance.toLocaleString("fr-FR")} pièces` : "…"}
          </span>
        </div>
        <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-snug flex-1">{coinMessage}</p>
        {lowBalance && (
          <Link
            href="/billing"
            className="self-start sm:self-auto text-[11px] font-semibold text-[#C84B31] bg-[#C84B31]/10 hover:bg-[#C84B31]/20 px-2.5 py-1 rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C84B31]/50"
          >
            Recharger
          </Link>
        )}
      </div>

      {/* Étapes */}
      <ol className="space-y-2">
        {progress.steps.map((step, index) => {
          const isNext = index === nextStepIndex;
          return (
            <li
              key={step.id}
              className={`flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border p-3 transition-colors ${
                isNext
                  ? "border-[#C84B31]/30 bg-[#C84B31]/[0.03] dark:bg-[#C84B31]/[0.06]"
                  : "border-neutral-200/80 dark:border-neutral-800"
              }`}
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                {step.done ? (
                  <CheckCircle2 className="w-6 h-6 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                ) : (
                  <span
                    aria-hidden="true"
                    className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-[11px] font-bold ${
                      isNext
                        ? "bg-[#C84B31] text-white"
                        : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400"
                    }`}
                  >
                    {index + 1}
                  </span>
                )}
                <div className="min-w-0 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <h3
                      className={`text-sm font-semibold ${
                        step.done
                          ? "text-neutral-500 dark:text-neutral-400 line-through decoration-neutral-300 dark:decoration-neutral-600"
                          : "text-neutral-900 dark:text-neutral-100"
                      }`}
                    >
                      {step.label}
                      <span className="sr-only">{step.done ? " (terminée)" : " (à faire)"}</span>
                    </h3>
                    <span className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-md whitespace-nowrap">
                      {step.costLabel}
                    </span>
                  </div>
                  {!step.done && (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-snug">{step.description}</p>
                  )}
                </div>
              </div>
              {step.href && (
                <Link
                  href={step.href}
                  className="w-full sm:w-auto shrink-0 bg-[#C84B31] hover:bg-[#B83E26] text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-2xs hover:shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C84B31]/50 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900"
                >
                  <span>{step.ctaLabel}</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
