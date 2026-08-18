"use client";

import Link from "next/link";
import Footer from "@/components/Footer";
import TopHeader from "@/components/TopHeader";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PricingPage() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const router = useRouter();

  const handleCheckout = async (planId: string, amount: number) => {
    setLoadingPlan(planId);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, amount }),
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url; // Redirect to SebPay
      } else {
        alert("Erreur lors de la création du paiement: " + (data.error || "Inconnue"));
      }
    } catch (error) {
      alert("Erreur de connexion.");
    } finally {
      setLoadingPlan(null);
    }
  };

  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      question: "Puis-je acheter plusieurs packs de pièces ?",
      answer: "Oui, tout à fait. Vos pièces s'accumulent dans votre portefeuille virtuel et n'ont pas de date d'expiration. Vous pouvez recharger quand vous le souhaitez."
    },
    {
      question: "Comment sont décomptées les pièces ?",
      answer: "Les pièces sont décomptées à chaque utilisation de l'IA (génération de chapitre, réécriture, etc.) en fonction du modèle choisi. Le modèle Standard est le plus économique, tandis que le modèle Plume d'Auteur consomme plus de pièces pour une qualité supérieure."
    },
    {
      question: "Quels sont les moyens de paiement acceptés ?",
      answer: "Nous acceptons les paiements par Mobile Money (Orange Money, MTN, Moov, etc.) ainsi que les cartes bancaires via notre partenaire sécurisé SebPay."
    },
    {
      question: "Est-ce un abonnement qui se renouvelle automatiquement ?",
      answer: "Non, il n'y a aucun abonnement caché. Vous achetez un pack de pièces en paiement unique (Pay-as-you-go). Vous ne payez que ce que vous consommez."
    }
  ];

  return (
    <div className="min-h-screen bg-neutral-50 font-body text-neutral-900 flex flex-col justify-between">
      <TopHeader />

      <main className="pt-20 pb-20 max-w-7xl mx-auto px-6 w-full">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="font-heading text-4xl sm:text-5xl font-extrabold text-neutral-900 tracking-tight mb-4">
            Payez uniquement ce que vous consommez
          </h1>
          <p className="text-lg text-neutral-600 mb-8">
            Fini les abonnements mensuels. Achetez des pièces et dépensez-les pour générer du texte, des chapitres ou des couvertures avec l'IA.
          </p>
        </div>

        {/* 3 Tiers Pricing Cards Grid */}
        <div className="flex flex-col md:flex-row items-stretch justify-center gap-6 max-w-6xl mx-auto mb-24">
          
          {/* Starter Plan */}
          <div className="flex-1 bg-white rounded-2xl border border-neutral-200 p-8 shadow-sm flex flex-col justify-between">
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-neutral-600">book</span>
              </div>
              <h3 className="font-heading text-xl font-bold text-neutral-900 mb-1">Starter</h3>
              <p className="text-sm text-neutral-500 mb-6">Idéal pour tester l'éditeur.</p>
              
              <div className="mb-6">
                <span className="text-4xl font-extrabold text-neutral-900">1000 FCFA</span>
              </div>
              
              <div className="mb-8 flex flex-col items-center">
                <div className="font-extrabold text-xl text-neutral-800">1 000 pièces</div>
                <div className="text-xs text-neutral-400 mt-1 uppercase font-bold">Sans bonus</div>
              </div>

              <ul className="space-y-4 text-sm text-neutral-700 text-left mb-8">
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-emerald-500 text-[20px] shrink-0">check_circle</span>
                  <span>Générer jusqu'à ~50 pages</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-emerald-500 text-[20px] shrink-0">check_circle</span>
                  <span>Modèle Standard</span>
                </li>
                <li className="flex items-center gap-3 opacity-50">
                  <span className="material-symbols-outlined text-neutral-300 text-[20px] shrink-0">cancel</span>
                  <span>Modèles IA Avancés</span>
                </li>
                <li className="flex items-center gap-3 opacity-50">
                  <span className="material-symbols-outlined text-neutral-300 text-[20px] shrink-0">cancel</span>
                  <span>Couvertures IA Premium</span>
                </li>
              </ul>
            </div>
            
            <button 
              onClick={() => handleCheckout("pack_starter", 1000)}
              disabled={loadingPlan !== null}
              className="w-full bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-900 font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
            >
              {loadingPlan === "pack_starter" ? "Chargement..." : "Choisir ce plan"}
            </button>
          </div>

          {/* Creator Plan */}
          <div className="flex-1 bg-white rounded-2xl border-2 border-secondary p-8 shadow-md flex flex-col justify-between relative transform md:-translate-y-4">
            <div className="absolute -top-3.5 left-1/2 transform -translate-x-1/2 bg-secondary text-white text-[10px] font-bold px-4 py-1.5 rounded-full uppercase tracking-wider">
              LE PLUS CHOISI
            </div>
            <div className="text-center mt-2">
              <div className="mx-auto w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-secondary">edit_document</span>
              </div>
              <h3 className="font-heading text-xl font-bold text-neutral-900 mb-1">Creator</h3>
              <p className="text-sm text-neutral-500 mb-6">Le choix parfait pour les passionnés.</p>
              
              <div className="mb-6">
                <span className="text-4xl font-extrabold text-neutral-900">2500 FCFA</span>
              </div>
              
              <div className="mb-8 flex flex-col items-center">
                <div className="font-extrabold text-xl text-neutral-800">3 000 pièces</div>
                <div className="text-xs text-emerald-600 mt-1 uppercase font-bold">+500 Bonus</div>
              </div>

              <ul className="space-y-4 text-sm text-neutral-700 text-left mb-8">
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-emerald-500 text-[20px] shrink-0">check_circle</span>
                  <span>Générer jusqu'à ~150 pages</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-emerald-500 text-[20px] shrink-0">check_circle</span>
                  <span>Modèle Standard</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-emerald-500 text-[20px] shrink-0">check_circle</span>
                  <span>Modèles IA Avancés</span>
                </li>
                <li className="flex items-center gap-3 opacity-50">
                  <span className="material-symbols-outlined text-neutral-300 text-[20px] shrink-0">cancel</span>
                  <span>Couvertures IA Premium</span>
                </li>
              </ul>
            </div>
            
            <button 
              onClick={() => handleCheckout("pack_creator", 2500)}
              disabled={loadingPlan !== null}
              className="w-full bg-secondary hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 shadow-sm"
            >
              {loadingPlan === "pack_creator" ? "Chargement..." : "Choisir ce plan"}
            </button>
          </div>

          {/* Author Plan */}
          <div className="flex-1 bg-white rounded-2xl border border-neutral-200 p-8 shadow-sm flex flex-col justify-between">
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-neutral-600">military_tech</span>
              </div>
              <h3 className="font-heading text-xl font-bold text-neutral-900 mb-1">Author</h3>
              <p className="text-sm text-neutral-500 mb-6">L'expérience ultime pour les créateurs.</p>
              
              <div className="mb-6">
                <span className="text-4xl font-extrabold text-neutral-900">5000 FCFA</span>
              </div>
              
              <div className="mb-8 flex flex-col items-center">
                <div className="font-extrabold text-xl text-neutral-800">7 000 pièces</div>
                <div className="text-xs text-emerald-600 mt-1 uppercase font-bold">+2000 Bonus</div>
              </div>

              <ul className="space-y-4 text-sm text-neutral-700 text-left mb-8">
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-emerald-500 text-[20px] shrink-0">check_circle</span>
                  <span>Générer jusqu'à ~350 pages</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-emerald-500 text-[20px] shrink-0">check_circle</span>
                  <span>Modèle Standard</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-emerald-500 text-[20px] shrink-0">check_circle</span>
                  <span>Modèles IA Avancés</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-emerald-500 text-[20px] shrink-0">check_circle</span>
                  <span>Couvertures IA Premium</span>
                </li>
              </ul>
            </div>
            
            <button 
              onClick={() => handleCheckout("pack_author", 5000)}
              disabled={loadingPlan !== null}
              className="w-full bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-900 font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
            >
              {loadingPlan === "pack_author" ? "Chargement..." : "Choisir ce plan"}
            </button>
          </div>

        </div>

        {/* Detailed Comparison Table */}
        <div className="max-w-5xl mx-auto mb-24">
          <h2 className="font-heading text-3xl font-extrabold text-center text-neutral-900 mb-10">Comparatif détaillé des forfaits</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="py-6 px-4 font-bold text-neutral-900 w-1/4">Fonctionnalités</th>
                  <th className="py-6 px-4 text-center w-1/4">
                    <div className="font-bold text-neutral-900">Starter</div>
                    <div className="text-xs text-neutral-500 font-normal">1000 FCFA</div>
                  </th>
                  <th className="py-6 px-4 text-center w-1/4 relative">
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 text-[10px] font-bold text-secondary uppercase tracking-wider">Populaire</div>
                    <div className="font-bold text-neutral-900">Creator</div>
                    <div className="text-xs text-neutral-500 font-normal">2500 FCFA</div>
                  </th>
                  <th className="py-6 px-4 text-center w-1/4">
                    <div className="font-bold text-neutral-900">Author</div>
                    <div className="text-xs text-neutral-500 font-normal">5000 FCFA</div>
                  </th>
                </tr>
              </thead>
              <tbody className="text-sm text-neutral-700">
                <tr className="border-b border-neutral-100">
                  <td className="py-5 px-4 font-semibold text-neutral-900">Pièces obtenues</td>
                  <td className="py-5 px-4 text-center font-bold">1 000</td>
                  <td className="py-5 px-4 text-center font-bold">3 000</td>
                  <td className="py-5 px-4 text-center font-bold">7 000</td>
                </tr>
                <tr className="border-b border-neutral-100">
                  <td className="py-5 px-4 font-semibold text-neutral-900">Pages générées estimées</td>
                  <td className="py-5 px-4 text-center">~50 pages</td>
                  <td className="py-5 px-4 text-center">~150 pages</td>
                  <td className="py-5 px-4 text-center">~350 pages</td>
                </tr>
                <tr className="border-b border-neutral-100">
                  <td className="py-5 px-4 font-semibold text-neutral-900">Accès Modèle IA Standard</td>
                  <td className="py-5 px-4 text-center"><span className="material-symbols-outlined text-emerald-500">check_circle</span></td>
                  <td className="py-5 px-4 text-center"><span className="material-symbols-outlined text-emerald-500">check_circle</span></td>
                  <td className="py-5 px-4 text-center"><span className="material-symbols-outlined text-emerald-500">check_circle</span></td>
                </tr>
                <tr className="border-b border-neutral-100">
                  <td className="py-5 px-4 font-semibold text-neutral-900">Accès Modèles IA Avancés</td>
                  <td className="py-5 px-4 text-center text-neutral-300">—</td>
                  <td className="py-5 px-4 text-center"><span className="material-symbols-outlined text-emerald-500">check_circle</span></td>
                  <td className="py-5 px-4 text-center"><span className="material-symbols-outlined text-emerald-500">check_circle</span></td>
                </tr>
                <tr className="border-b border-neutral-100">
                  <td className="py-5 px-4 font-semibold text-neutral-900">Accès Modèle Plume d'Auteur</td>
                  <td className="py-5 px-4 text-center text-neutral-300">—</td>
                  <td className="py-5 px-4 text-center text-neutral-300">—</td>
                  <td className="py-5 px-4 text-center"><span className="material-symbols-outlined text-emerald-500">check_circle</span></td>
                </tr>
                <tr className="border-b border-neutral-100">
                  <td className="py-5 px-4 font-semibold text-neutral-900">Génération de Couvertures</td>
                  <td className="py-5 px-4 text-center text-neutral-300">—</td>
                  <td className="py-5 px-4 text-center text-neutral-300">—</td>
                  <td className="py-5 px-4 text-center"><span className="material-symbols-outlined text-emerald-500">check_circle</span></td>
                </tr>
                <tr className="border-b border-neutral-100">
                  <td className="py-5 px-4 font-semibold text-neutral-900">Support client</td>
                  <td className="py-5 px-4 text-center">Standard</td>
                  <td className="py-5 px-4 text-center">Prioritaire</td>
                  <td className="py-5 px-4 text-center">VIP 24/7</td>
                </tr>
                <tr className="border-b border-neutral-100">
                  <td className="py-5 px-4 font-semibold text-neutral-900">Paiement Mobile Money</td>
                  <td className="py-5 px-4 text-center"><span className="material-symbols-outlined text-emerald-500">check_circle</span></td>
                  <td className="py-5 px-4 text-center"><span className="material-symbols-outlined text-emerald-500">check_circle</span></td>
                  <td className="py-5 px-4 text-center"><span className="material-symbols-outlined text-emerald-500">check_circle</span></td>
                </tr>
                <tr className="border-b border-neutral-100">
                  <td className="py-5 px-4 font-semibold text-neutral-900">Sans engagement</td>
                  <td className="py-5 px-4 text-center"><span className="material-symbols-outlined text-emerald-500">check_circle</span></td>
                  <td className="py-5 px-4 text-center"><span className="material-symbols-outlined text-emerald-500">check_circle</span></td>
                  <td className="py-5 px-4 text-center"><span className="material-symbols-outlined text-emerald-500">check_circle</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto mb-20">
          <h2 className="font-heading text-3xl font-extrabold text-center text-neutral-900 mb-10">Questions fréquentes</h2>
          <div className="border-t border-neutral-200">
            {faqs.map((faq, index) => (
              <div key={index} className="border-b border-neutral-200">
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full py-6 flex items-center justify-between text-left focus:outline-none"
                >
                  <span className="font-bold text-neutral-900">{faq.question}</span>
                  <span className="material-symbols-outlined text-neutral-400">
                    {openFaq === index ? "remove" : "add"}
                  </span>
                </button>
                {openFaq === index && (
                  <div className="pb-6 text-neutral-600 text-sm leading-relaxed pr-8">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

      </main>

      <Footer />
    </div>
  );
}
