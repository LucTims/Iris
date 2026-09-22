"use client";

import { MessageSquareText, PenTool, BookOpenCheck } from "lucide-react";

export default function HowItWorksSection() {
  const steps = [
    {
      icon: MessageSquareText,
      title: "1. Onboarding & Plan",
      desc: "Répondez à quelques questions sur votre expertise. L'IA structure immédiatement le plan parfait pour votre audience."
    },
    {
      icon: PenTool,
      title: "2. Co-rédaction Guidée",
      desc: "L'IA rédige les premiers jets. Vous ajustez, donnez le ton et validez chapitre par chapitre. Fini le syndrome de la page blanche."
    },
    {
      icon: BookOpenCheck,
      title: "3. Publication",
      desc: "Générez votre couverture en 1 clic et exportez votre manuscrit formaté (PDF, EPUB) prêt à être vendu."
    }
  ];

  return (
    <section className="py-24 md:py-32 bg-white dark:bg-neutral-900 border-t border-neutral-100 dark:border-neutral-800/50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="font-heading text-3xl md:text-5xl font-extrabold text-neutral-900 dark:text-neutral-100 mb-6 tracking-tight">
            Comment ça marche ?
          </h2>
          <p className="text-lg md:text-xl text-neutral-600 dark:text-neutral-400">
            Un processus en 3 étapes simples pour transformer votre idée en livre en quelques jours, pas en quelques mois.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8 relative">
          {/* Connecting line for desktop */}
          <div className="hidden md:block absolute top-12 left-[16.66%] right-[16.66%] h-0.5 bg-neutral-100 dark:bg-neutral-800 z-0"></div>
          
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div key={idx} className="relative z-10 flex flex-col items-center text-center group">
                <div className="w-24 h-24 rounded-full bg-white dark:bg-neutral-900 border-8 border-[#FDF3F1] dark:border-neutral-800 flex items-center justify-center mb-8 text-[#C84B31] transition-transform group-hover:scale-105">
                  <Icon className="w-10 h-10" />
                </div>
                <h3 className="font-heading text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">{step.title}</h3>
                <p className="text-base text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-sm">{step.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
