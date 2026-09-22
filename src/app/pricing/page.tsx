"use client";

import Link from "next/link";
import Footer from "@/components/Footer";
import TopHeader from "@/components/TopHeader";
import AppLayout from "@/components/AppLayout";
import { useUser } from "@/hooks/useUser";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const CHARIOW_LINKS: Record<string, string> = {
  starter: "https://rykvflcc.mychariow.market/prd_mryxlaqo/checkout",
  creator: "https://rykvflcc.mychariow.market/prd_18k5s6e1/checkout",
  author: "https://rykvflcc.mychariow.market/prd_48qp19t3/checkout",
};

function PricingInner() {
  const { user, isLoading, walletBalance, refreshWalletBalance } = useUser();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentCompleted = searchParams.get("payment_completed") === "true";

  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Si l'utilisateur revient après paiement Chariow, on rafraîchit son solde automatiquement
  useEffect(() => {
    if (paymentCompleted && user) {
      refreshWalletBalance();
      const interval = setInterval(() => {
        refreshWalletBalance();
      }, 3000);
      const timeout = setTimeout(() => clearInterval(interval), 15000);
      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [paymentCompleted, user, refreshWalletBalance]);

  // Track ViewContent for the pricing page
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).fbq) {
      (window as any).fbq("track", "ViewContent", {
        content_name: "Pricing Page"
      });
    }
  }, []);

  const initiatePayment = (planId: string) => {
    if (!user) {
      alert("Veuillez vous connecter ou créer un compte pour acheter des pièces.");
      router.push("/login?redirect=/pricing");
      return;
    }

    const checkoutUrl = CHARIOW_LINKS[planId];
    if (checkoutUrl) {
      setLoadingPlan(planId);
      
      if (typeof window !== "undefined" && (window as any).fbq) {
        (window as any).fbq("track", "InitiateCheckout", {
          content_ids: [planId]
        });
      }

      const redirectUrl = encodeURIComponent(`${window.location.origin}/dashboard?payment_completed=true`);
      window.location.href = `${checkoutUrl}?email=${encodeURIComponent(
        user.email || ""
      )}&client_reference_id=${user.id}&redirect_url=${redirectUrl}&success_url=${redirectUrl}&return_url=${redirectUrl}`;
    }
  };

  const faqs = [
    {
      question: "Puis-je acheter plusieurs packs de pièces ?",
      answer:
        "Oui, absolument ! Vous pouvez recharger des pièces à tout moment. Vos pièces s'accumulent dans votre compte sans aucune date d'expiration.",
    },
    {
      question: "Comment mes pièces sont-elles créditées ?",
      answer:
        "Dès que vous confirmez votre paiement Mobile Money ou carte bancaire sur Chariow, vos pièces sont créditées automatiquement et instantanément sur votre compte Iris.",
    },
    {
      question: "Comment sont décomptées les pièces ?",
      answer:
        "Écrire un livre coûte un nombre de pièces PAR PAGE, selon le modèle choisi : environ 20 pièces/page avec Gemini (éco), 30 avec ChatGPT (recommandé) et 50 avec Claude (premium). Le coût total exact s'affiche avant de lancer la rédaction, et une couverture générée par IA coûte 200 pièces.",
    },
    {
      question: "Quels sont les moyens de paiement acceptés ?",
      answer:
        "Nous acceptons les paiements par Mobile Money (Orange Money, MTN, Moov, Wave, etc.) et cartes bancaires via notre partenaire sécurisé Chariow.",
    },
    {
      question: "Est-ce un abonnement qui se renouvelle automatiquement ?",
      answer:
        "Non, il n'y a aucun abonnement récurrent. Vous achetez un pack de pièces en paiement unique (Pay-as-you-go) quand vous en avez besoin.",
    },
  ];

  const PageContent = (
    <div className="w-full flex flex-col justify-between min-h-screen">
      {!user && (
        <div className="w-full">
          <TopHeader />
        </div>
      )}

      <main className={`flex-1 flex flex-col items-center pt-16 ${user ? "pb-16" : "pb-32"} px-4 relative`}>
        {/* Background decorative elements */}
        <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-primary/10 to-transparent -z-10 pointer-events-none" />

        {/* Bannière de retour après paiement Chariow */}
        {paymentCompleted && (
          <div className="max-w-3xl w-full mb-8 p-5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-4 shadow-sm animate-fade-in">
            <span className="material-symbols-outlined text-emerald-600 text-3xl shrink-0 mt-0.5">
              check_circle
            </span>
            <div className="flex-1">
              <h3 className="font-bold text-emerald-950 text-base mb-1">
                Paiement validé avec succès !
              </h3>
              <p className="text-emerald-800 text-sm leading-relaxed">
                Vos pièces ont été automatiquement créditées sur votre portefeuille. Vous pouvez commencer à rédiger dès maintenant.
              </p>
            </div>
          </div>
        )}

        <div className="text-center max-w-3xl mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-neutral-900 mb-6 tracking-tight">
            Des pièces pour <span className="text-primary">donner vie</span> à vos histoires
          </h1>
          <p className="text-lg text-neutral-600 mb-6 max-w-2xl mx-auto">
            Achetez des packs de pièces à la demande. Pas d'abonnement, pas d'engagement. Utilisez vos pièces pour générer des chapitres avec l'IA de votre choix.
          </p>

          {user && (
            <div className="inline-flex items-center gap-2 bg-neutral-100 text-neutral-800 px-4 py-2 rounded-full font-medium text-sm mb-4 border border-neutral-200">
              <span className="material-symbols-outlined text-primary text-base">account_balance_wallet</span>
              Votre solde actuel : <strong className="text-neutral-950">{walletBalance.toLocaleString("fr-FR")} pièces</strong>
            </div>
          )}

          <div>
            <div className="inline-flex items-center gap-2 bg-secondary/10 text-secondary px-4 py-2 rounded-full font-medium text-sm">
              <span className="material-symbols-outlined text-base">bolt</span>
              Accès instantané par Mobile Money & Cartes bancaires
            </div>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl w-full mx-auto relative z-10">
          {/* Starter Plan */}
          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-8 border border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full relative">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">Pack Starter</h3>
              <p className="text-neutral-500 dark:text-neutral-400 text-sm h-10">Parfait pour découvrir la plateforme et écrire un premier livre court.</p>
            </div>

            <div className="mb-8 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-neutral-900 dark:text-neutral-100">1 000</span>
              <span className="text-lg text-neutral-500 dark:text-neutral-400 font-medium">FCFA</span>
            </div>

            <div className="flex items-center gap-3 mb-8 bg-neutral-50 p-4 rounded-2xl border border-neutral-100">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-primary">monetization_on</span>
              </div>
              <div>
                <div className="font-bold text-neutral-900 dark:text-neutral-100">900 Pièces</div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400">Crédit immédiat</div>
              </div>
            </div>

            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-green-500 text-xl shrink-0">check_circle</span>
                <span className="text-neutral-700 dark:text-neutral-300 text-sm">Tous les modèles IA inclus (Gemini, ChatGPT, Claude)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-green-500 text-xl shrink-0">check_circle</span>
                <span className="text-neutral-700 text-sm">Idéal pour écrire ~45 pages</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-green-500 text-xl shrink-0">check_circle</span>
                <span className="text-neutral-700 dark:text-neutral-300 text-sm">Pas de date d'expiration</span>
              </li>
            </ul>

            <button
              onClick={() => initiatePayment("starter")}
              disabled={loadingPlan === "starter"}
              className="w-full py-4 rounded-xl font-bold transition-all bg-neutral-100 text-neutral-900 hover:bg-neutral-200 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loadingPlan === "starter" ? (
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
              ) : (
                "Acheter ce pack"
              )}
            </button>
          </div>

          {/* Creator Plan - Highlighted */}
          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-8 border-2 border-primary shadow-[0_0_30px_-10px_rgba(255,165,0,0.3)] hover:shadow-[0_0_40px_-10px_rgba(255,165,0,0.5)] transition-shadow flex flex-col h-full relative transform md:-translate-y-4">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#C84B31] text-white text-[11px] font-semibold px-3.5 py-1 rounded-full uppercase tracking-wider whitespace-nowrap shadow-sm">
              Recommandé
            </div>

            <div className="mb-6 mt-2">
              <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">Pack Créateur</h3>
              <p className="text-neutral-500 dark:text-neutral-400 text-sm h-10">L'équilibre parfait pour écrire votre premier livre entier.</p>
            </div>

            <div className="mb-8 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-neutral-900 dark:text-neutral-100">3 500</span>
              <span className="text-lg text-neutral-500 dark:text-neutral-400 font-medium">FCFA</span>
            </div>

            <div className="flex items-center gap-3 mb-8 bg-primary/10 p-4 rounded-2xl border border-primary/20">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-primary">monetization_on</span>
              </div>
              <div>
                <div className="font-bold text-neutral-900 dark:text-neutral-100">4 000 Pièces</div>
                <div className="text-xs font-semibold text-primary">+500 pièces bonus offertes</div>
              </div>
            </div>

            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary text-xl shrink-0">check_circle</span>
                <span className="text-neutral-700 dark:text-neutral-300 text-sm font-medium">Tous les modèles IA inclus (Gemini, ChatGPT, Claude)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary text-xl shrink-0">check_circle</span>
                <span className="text-neutral-700 text-sm">Jusqu'à ~200 pages de rédaction</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary text-xl shrink-0">check_circle</span>
                <span className="text-neutral-700 text-sm">Outils de réécriture et bible littéraire</span>
              </li>
            </ul>

            <button
              onClick={() => initiatePayment("creator")}
              disabled={loadingPlan === "creator"}
              className="w-full py-4 rounded-xl font-bold transition-all bg-primary text-white hover:brightness-105 shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              {loadingPlan === "creator" ? (
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
              ) : (
                "Acheter ce pack"
              )}
            </button>
          </div>

          {/* Author Plan */}
          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-8 border border-secondary/20 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full relative">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">Pack Auteur Pro</h3>
              <p className="text-neutral-500 dark:text-neutral-400 text-sm h-10">Pour les auteurs réguliers et la plus haute qualité littéraire.</p>
            </div>

            <div className="mb-8 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-neutral-900 dark:text-neutral-100">5 000</span>
              <span className="text-lg text-neutral-500 dark:text-neutral-400 font-medium">FCFA</span>
            </div>

            <div className="flex items-center gap-3 mb-8 bg-secondary/5 p-4 rounded-2xl border border-secondary/10">
              <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-secondary">monetization_on</span>
              </div>
              <div>
                <div className="font-bold text-neutral-900">7 500 Pièces</div>
                <div className="text-xs text-secondary">+2 500 pièces bonus offertes</div>
              </div>
            </div>

            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-secondary text-xl shrink-0">check_circle</span>
                <span className="text-neutral-700 dark:text-neutral-300 text-sm">Tous les modèles IA inclus (Gemini, ChatGPT, Claude)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-secondary text-xl shrink-0">check_circle</span>
                <span className="text-neutral-700 dark:text-neutral-300 text-sm">Style d'écriture humain et captivant</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-secondary text-xl shrink-0">check_circle</span>
                <span className="text-neutral-700 text-sm">Jusqu'à ~375 pages de rédaction</span>
              </li>
            </ul>

            <button
              onClick={() => initiatePayment("author")}
              disabled={loadingPlan === "author"}
              className="w-full py-4 rounded-xl font-bold transition-all bg-secondary/10 text-secondary hover:bg-secondary/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loadingPlan === "author" ? (
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
              ) : (
                "Acheter ce pack"
              )}
            </button>
          </div>
        </div>

        {/* Note d'estimation */}
        <p className="max-w-2xl w-full mx-auto mt-8 text-center text-xs text-neutral-400 leading-relaxed">
          Tous les packs donnent accès à <strong>tous les modèles IA</strong> et n'ont pas de date d'expiration.
          Le coût d'un livre dépend du nombre de pages et du modèle choisi :
          environ <strong>20 pièces/page</strong> avec Gemini (éco), <strong>30</strong> avec ChatGPT (recommandé)
          et <strong>50</strong> avec Claude (premium). Le coût exact s'affiche avant chaque génération.
        </p>

        {/* FAQ Section */}
        <div className="max-w-3xl w-full mx-auto mt-24 mb-16">
          <h2 className="text-3xl font-bold text-center text-neutral-900 mb-10">Questions Fréquentes</h2>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className={`border rounded-2xl overflow-hidden transition-colors ${
                  openFaq === index ? "border-primary bg-white" : "border-neutral-200 bg-white hover:border-neutral-300"
                }`}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full flex items-center justify-between p-6 text-left focus:outline-none cursor-pointer"
                >
                  <span className="font-bold text-neutral-900">{faq.question}</span>
                  <span
                    className={`material-symbols-outlined text-neutral-400 transition-transform ${
                      openFaq === index ? "rotate-180" : ""
                    }`}
                  >
                    expand_more
                  </span>
                </button>
                {openFaq === index && (
                  <div className="px-6 pb-6 text-neutral-600 leading-relaxed">{faq.answer}</div>
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

export default function PricingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
          <span className="material-symbols-outlined animate-spin text-4xl text-secondary">
            progress_activity
          </span>
        </div>
      }
    >
      <PricingInner />
    </Suspense>
  );
}
