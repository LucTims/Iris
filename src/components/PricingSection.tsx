"use client";

import Link from "next/link";
import { CheckCircle2, Zap } from "lucide-react";

export default function PricingSection() {
  const plans = [
    {
      name: "Pack Starter",
      desc: "Parfait pour découvrir la plateforme et écrire un premier livre court.",
      price: "1 000",
      coins: "900",
      pages: "~45",
      popular: false,
    },
    {
      name: "Pack Créateur",
      desc: "L'idéal pour écrire un livre complet et générer des couvertures HD.",
      price: "3 500",
      coins: "4 000",
      pages: "~200",
      popular: true,
      bonus: "+500 pièces offertes",
    },
    {
      name: "Pack Auteur Pro",
      desc: "Pour les auteurs réguliers et la plus haute qualité littéraire.",
      price: "5 000",
      coins: "7 500",
      pages: "~375",
      popular: false,
      bonus: "+2 500 pièces offertes",
    }
  ];

  return (
    <section className="py-24 md:py-32 bg-white dark:bg-neutral-900 border-t border-neutral-100 dark:border-neutral-800/50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="font-heading text-3xl md:text-5xl font-extrabold text-neutral-900 dark:text-neutral-100 mb-6 tracking-tight">
            Des tarifs simples et sans abonnement
          </h2>
          <p className="text-lg md:text-xl text-neutral-600 dark:text-neutral-400">
            Achetez des packs de pièces à la demande. Utilisez vos pièces uniquement quand vous générez du texte ou des images.
          </p>
          <div className="inline-flex items-center gap-2 bg-[#FDF3F1] text-[#C84B31] px-4 py-2 rounded-full font-medium text-sm mt-6 border border-[#F4C5BC]/60">
            <Zap className="w-4 h-4" />
            Accès instantané par Mobile Money & Cartes bancaires
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl w-full mx-auto relative z-10">
          {plans.map((plan, idx) => (
            <div 
              key={idx} 
              className={`bg-white dark:bg-neutral-900 rounded-[2rem] p-8 md:p-10 border ${plan.popular ? 'border-[#C84B31] shadow-2xl relative scale-100 md:scale-105 z-10' : 'border-neutral-200 dark:border-neutral-800 shadow-lg'} flex flex-col h-full`}
            >
              {plan.popular && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#C84B31] text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                  Le plus choisi
                </div>
              )}
              
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">{plan.name}</h3>
                <p className="text-neutral-500 dark:text-neutral-400 text-sm h-10">{plan.desc}</p>
              </div>

              <div className="mb-8 flex items-baseline gap-2">
                <span className="text-5xl font-extrabold text-neutral-900 dark:text-neutral-100">{plan.price}</span>
                <span className="text-xl text-neutral-500 dark:text-neutral-400 font-medium">FCFA</span>
              </div>

              <div className={`flex items-center justify-between mb-8 p-4 rounded-2xl border ${plan.popular ? 'bg-[#FDF3F1] border-[#F4C5BC]/60' : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-100 dark:border-neutral-700'}`}>
                <div>
                  <div className={`font-extrabold text-lg ${plan.popular ? 'text-[#C84B31]' : 'text-neutral-900 dark:text-neutral-100'}`}>{plan.coins} Pièces</div>
                  {plan.bonus && <div className="text-xs font-bold text-[#C84B31]">{plan.bonus}</div>}
                </div>
              </div>

              <ul className="space-y-4 mb-10 flex-1">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="text-[#C84B31] w-5 h-5 shrink-0" />
                  <span className="text-neutral-700 dark:text-neutral-300 text-sm font-medium">Idéal pour écrire {plan.pages} pages</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="text-[#C84B31] w-5 h-5 shrink-0" />
                  <span className="text-neutral-700 dark:text-neutral-300 text-sm font-medium">Tous les modèles (ChatGPT, Claude)</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="text-[#C84B31] w-5 h-5 shrink-0" />
                  <span className="text-neutral-700 dark:text-neutral-300 text-sm font-medium">Pas de date d'expiration</span>
                </li>
              </ul>

              <Link href="/register">
                <button className={`w-full py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${plan.popular ? 'bg-[#C84B31] hover:bg-[#B83E26] text-white shadow-md' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 hover:bg-neutral-200 dark:hover:bg-neutral-700'}`}>
                  Commencer avec Iris
                </button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
