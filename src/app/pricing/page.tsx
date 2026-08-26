"use client";

import Link from "next/link";
import Footer from "@/components/Footer";
import TopHeader from "@/components/TopHeader";
import AppLayout from "@/components/AppLayout";
import { useUser } from "@/hooks/useUser";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getPackById } from "@/lib/coinPacks";

const CHARIOW_LINKS: Record<string, string> = {
  starter: "https://tteskarz.mychariow.shop/prd_waqgpzhy/checkout",
  creator: "https://tteskarz.mychariow.shop/prd_jvzz32pf/checkout",
  author: "https://tteskarz.mychariow.shop/prd_yekmrhdn/checkout"
};

export default function PricingPage() {
  const { user, isLoading } = useUser();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const router = useRouter();

  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const initiatePayment = (planId: string) => {
    if (!user) {
      alert("Veuillez vous connecter ou créer un compte pour acheter des pièces.");
      router.push("/login?redirect=/pricing");
      return;
    }
    
    const checkoutUrl = CHARIOW_LINKS[planId];
    if (checkoutUrl) {
      setLoadingPlan(planId);
      // We append email and a custom client reference id so Chariow can link the payment to the user
      window.location.href = `${checkoutUrl}?email=${encodeURIComponent(user.email || '')}&client_reference_id=${user.id}`;
    }
  };

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
      answer: "Nous acceptons les paiements par Mobile Money (Orange Money, MTN, Moov, etc.) via notre partenaire sécurisé Chariow."
    },
    {
      question: "Est-ce un abonnement qui se renouvelle automatiquement ?",
      answer: "Non, il n'y a aucun abonnement caché. Vous achetez un pack de pièces en paiement unique (Pay-as-you-go). Vous ne payez que ce que vous consommez."
    }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-4xl text-secondary">progress_activity</span>
      </div>
    );
  }

  const PageContent = (
    <div className="w-full flex flex-col justify-between min-h-screen">
      {!user && (
        <div className="w-full">
          <TopHeader />
        </div>
      )}

      <main className={`flex-1 flex flex-col items-center pt-16 ${user ? 'pb-16' : 'pb-32'} px-4 relative`}>
        {/* Background decorative elements */}
        <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-primary/10 to-transparent -z-10 pointer-events-none" />
        
        <div className="text-center max-w-3xl mb-16">
          <h1 className="text-4xl md:text-5xl font-extrabold text-neutral-900 mb-6 tracking-tight">
            Des pièces pour <span className="text-primary">donner vie</span> à vos histoires
          </h1>
          <p className="text-lg text-neutral-600 mb-8 max-w-2xl mx-auto">
            Achetez des packs de pièces à la demande. Pas d'abonnement, pas d'engagement. Utilisez vos pièces pour générer des chapitres avec l'IA de votre choix.
          </p>
          
          <div className="inline-flex items-center gap-2 bg-secondary/10 text-secondary px-4 py-2 rounded-full font-medium text-sm">
            <span className="material-symbols-outlined text-base">bolt</span>
            Accès instantané après paiement Mobile Money
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl w-full mx-auto relative z-10">
          
          {/* Starter Plan */}
          <div className="bg-white rounded-3xl p-8 border border-neutral-200 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full relative">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-neutral-900 mb-2">Pack Découverte</h3>
              <p className="text-neutral-500 text-sm h-10">Parfait pour tester la plateforme et écrire un petit chapitre.</p>
            </div>
            
            <div className="mb-8 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-neutral-900">1 000</span>
              <span className="text-lg text-neutral-500 font-medium">FCFA</span>
            </div>
            
            <div className="flex items-center gap-3 mb-8 bg-neutral-50 p-4 rounded-2xl border border-neutral-100">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-primary">monetization_on</span>
              </div>
              <div>
                <div className="font-bold text-neutral-900">1 000 Pièces</div>
                <div className="text-xs text-neutral-500">Crédit immédiat</div>
              </div>
            </div>
            
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-green-500 text-xl shrink-0">check_circle</span>
                <span className="text-neutral-700 text-sm">Génération de base (Iris Starter)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-green-500 text-xl shrink-0">check_circle</span>
                <span className="text-neutral-700 text-sm">Idéal pour ~10 000 mots</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-green-500 text-xl shrink-0">check_circle</span>
                <span className="text-neutral-700 text-sm">Pas de date d'expiration</span>
              </li>
            </ul>
            
            <button 
              onClick={() => initiatePayment('starter')}
              disabled={loadingPlan === 'starter'}
              className="w-full py-4 rounded-xl font-bold transition-all bg-neutral-100 text-neutral-900 hover:bg-neutral-200 flex items-center justify-center gap-2"
            >
              {loadingPlan === 'starter' ? (
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
              ) : (
                "Choisir ce plan"
              )}
            </button>
          </div>

          {/* Creator Plan - Highlighted */}
          <div className="bg-neutral-900 rounded-3xl p-8 border border-neutral-800 shadow-xl hover:shadow-2xl transition-shadow flex flex-col h-full relative transform md:-translate-y-4">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider">
              Le plus populaire
            </div>
            
            <div className="mb-6 mt-2">
              <h3 className="text-xl font-bold text-white mb-2">Pack Créateur</h3>
              <p className="text-neutral-400 text-sm h-10">L'équilibre parfait pour écrire votre premier livre entier.</p>
            </div>
            
            <div className="mb-8 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-white">2 500</span>
              <span className="text-lg text-neutral-400 font-medium">FCFA</span>
            </div>
            
            <div className="flex items-center gap-3 mb-8 bg-white/5 p-4 rounded-2xl border border-white/10">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-primary">monetization_on</span>
              </div>
              <div>
                <div className="font-bold text-white">3 000 Pièces</div>
                <div className="text-xs text-primary">+500 pièces bonus</div>
              </div>
            </div>
            
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary text-xl shrink-0">check_circle</span>
                <span className="text-neutral-300 text-sm">Accès à Iris Pro (GPT-4o)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary text-xl shrink-0">check_circle</span>
                <span className="text-neutral-300 text-sm">Idéal pour un livre de 50 000 mots</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary text-xl shrink-0">check_circle</span>
                <span className="text-neutral-300 text-sm">Outils de réécriture avancés</span>
              </li>
            </ul>
            
            <button 
              onClick={() => initiatePayment('creator')}
              disabled={loadingPlan === 'creator'}
              className="w-full py-4 rounded-xl font-bold transition-all bg-primary text-primary-foreground hover:brightness-110 flex items-center justify-center gap-2"
            >
              {loadingPlan === 'creator' ? (
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
              ) : (
                "Choisir ce plan"
              )}
            </button>
          </div>

          {/* Author Plan */}
          <div className="bg-white rounded-3xl p-8 border border-secondary/20 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full relative">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-neutral-900 mb-2">Pack Auteur Pro</h3>
              <p className="text-neutral-500 text-sm h-10">Pour les auteurs réguliers et la plus haute qualité littéraire.</p>
            </div>
            
            <div className="mb-8 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-neutral-900">5 000</span>
              <span className="text-lg text-neutral-500 font-medium">FCFA</span>
            </div>
            
            <div className="flex items-center gap-3 mb-8 bg-secondary/5 p-4 rounded-2xl border border-secondary/10">
              <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-secondary">monetization_on</span>
              </div>
              <div>
                <div className="font-bold text-neutral-900">7 000 Pièces</div>
                <div className="text-xs text-secondary">+2 000 pièces bonus</div>
              </div>
            </div>
            
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-secondary text-xl shrink-0">check_circle</span>
                <span className="text-neutral-700 text-sm">Accès à Iris Author (Claude 3.5 Sonnet)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-secondary text-xl shrink-0">check_circle</span>
                <span className="text-neutral-700 text-sm">Style d'écriture humain et captivant</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-secondary text-xl shrink-0">check_circle</span>
                <span className="text-neutral-700 text-sm">Génération de livres multiples</span>
              </li>
            </ul>
            
            <button 
              onClick={() => initiatePayment('author')}
              disabled={loadingPlan === 'author'}
              className="w-full py-4 rounded-xl font-bold transition-all bg-secondary/10 text-secondary hover:bg-secondary/20 flex items-center justify-center gap-2"
            >
              {loadingPlan === 'author' ? (
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
              ) : (
                "Choisir ce plan"
              )}
            </button>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl w-full mx-auto mt-32 mb-16">
          <h2 className="text-3xl font-bold text-center text-neutral-900 mb-10">Questions Fréquentes</h2>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div 
                key={index} 
                className={`border rounded-2xl overflow-hidden transition-colors ${openFaq === index ? 'border-primary bg-white' : 'border-neutral-200 bg-white hover:border-neutral-300'}`}
              >
                <button 
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full flex items-center justify-between p-6 text-left focus:outline-none"
                >
                  <span className="font-bold text-neutral-900">{faq.question}</span>
                  <span className={`material-symbols-outlined text-neutral-400 transition-transform ${openFaq === index ? 'rotate-180' : ''}`}>
                    expand_more
                  </span>
                </button>
                {openFaq === index && (
                  <div className="px-6 pb-6 text-neutral-600 leading-relaxed">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>

      {!user && <Footer />}
    </div>
  );

  if (user) {
    return <AppLayout>{PageContent}</AppLayout>;
  }

  return PageContent;
}
