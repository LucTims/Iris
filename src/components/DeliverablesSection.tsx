"use client";

import { CheckCircle2 } from "lucide-react";

export default function DeliverablesSection() {
  const deliverables = [
    "Un plan détaillé et structuré, généré selon les standards éditoriaux.",
    "Un manuscrit complet, co-rédigé et relu par notre IA linguistique.",
    "Une couverture HD générée sur mesure, aux bonnes dimensions.",
    "Votre livre prêt à vendre exporté en formats PDF, EPUB et DOCX.",
    "L'intégralité de vos droits d'auteur conservés à 100%."
  ];

  return (
    <section className="py-24 md:py-32 bg-neutral-50/60 dark:bg-neutral-800/20">
      <div className="max-w-4xl mx-auto px-6">
        <div className="bg-white dark:bg-neutral-900 rounded-[2.5rem] p-10 md:p-16 shadow-xl border border-neutral-200/60 dark:border-neutral-800">
          <div className="text-center mb-12">
            <h2 className="font-heading text-3xl md:text-5xl font-extrabold text-neutral-900 dark:text-neutral-100 mb-6 tracking-tight">
              Ce que vous obtenez exactement
            </h2>
            <p className="text-lg text-neutral-600 dark:text-neutral-400">
              Pas de mauvaise surprise. À la fin du processus, vous repartez avec l'arsenal complet de l'auteur indépendant.
            </p>
          </div>

          <ul className="space-y-6 max-w-2xl mx-auto">
            {deliverables.map((item, idx) => (
              <li key={idx} className="flex items-start gap-4">
                <CheckCircle2 className="w-7 h-7 text-[#C84B31] shrink-0 mt-0.5" />
                <span className="text-lg font-medium text-neutral-800 dark:text-neutral-200">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
