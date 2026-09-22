"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: "Est-ce que je conserve les droits d'auteur sur mon livre ?",
      answer: "Absolument ! Vous êtes l'unique propriétaire et auteur de votre livre. Vous conservez 100% des droits commerciaux et pouvez le publier où vous voulez (Amazon KDP, Fnac, votre propre site) sous votre propre nom."
    },
    {
      question: "Ais-je besoin de souscrire à un abonnement mensuel ?",
      answer: "Non, Iris fonctionne sans aucun abonnement. Vous achetez des pièces (crédits) uniquement lorsque vous en avez besoin. Vos pièces n'expirent jamais."
    },
    {
      question: "Quels sont les moyens de paiement acceptés ?",
      answer: "Nous acceptons les paiements par Mobile Money (Orange Money, MTN, Moov, Wave, etc.) et cartes bancaires via notre partenaire de paiement sécurisé."
    },
    {
      question: "Puis-je exporter mon livre pour le vendre ?",
      answer: "Oui, Iris vous permet de générer des exports parfaitement formatés en un clic aux formats PDF, EPUB et DOCX. Ces fichiers sont directement compatibles avec les grandes plateformes de vente comme Amazon KDP."
    }
  ];

  return (
    <section className="py-24 md:py-32 bg-white dark:bg-neutral-900 border-t border-neutral-100 dark:border-neutral-800/50">
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="font-heading text-3xl md:text-5xl font-extrabold text-neutral-900 dark:text-neutral-100 mb-6 tracking-tight">
            Questions Fréquentes
          </h2>
          <p className="text-lg md:text-xl text-neutral-600 dark:text-neutral-400">
            Tout ce que vous devez savoir avant de commencer à écrire.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div 
                key={index} 
                className="bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden transition-all duration-300"
              >
                <button
                  className="w-full px-6 py-5 text-left flex items-center justify-between focus:outline-none cursor-pointer"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                >
                  <span className="font-bold text-neutral-900 dark:text-neutral-100 pr-8 text-lg">
                    {faq.question}
                  </span>
                  <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-300 ${isOpen ? 'bg-[#C84B31] text-white rotate-180' : 'bg-white dark:bg-neutral-800 text-neutral-500 shadow-sm'}`}>
                    <ChevronDown className="w-5 h-5" />
                  </div>
                </button>
                <div 
                  className={`px-6 overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 pb-6 opacity-100' : 'max-h-0 opacity-0'}`}
                >
                  <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed font-medium">
                    {faq.answer}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
