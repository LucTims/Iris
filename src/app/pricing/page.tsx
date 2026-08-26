"use client";

import Link from "next/link";
import Footer from "@/components/Footer";
import TopHeader from "@/components/TopHeader";
import AppLayout from "@/components/AppLayout";
import { useUser } from "@/hooks/useUser";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getPackById } from "@/lib/coinPacks";

export default function PricingPage() {
  const { user, isLoading } = useUser();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const router = useRouter();

  // Payment Modal State
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selectedAmount, setSelectedAmount] = useState<number>(0);
  
  const [phone, setPhone] = useState("");
  const [operator, setOperator] = useState("ORANGE");
  const [country, setCountry] = useState("CI");
  const [otpCode, setOtpCode] = useState("");

  const coinsForPack = (id: string) => getPackById(id)?.coins || 0;

  const initiatePayment = (planId: string, amount: number) => {
    if (!user) {
      alert("Veuillez vous connecter ou créer un compte pour acheter des pièces.");
      router.push("/login?redirect=/pricing");
      return;
    }
    setSelectedPlanId(planId);
    setSelectedAmount(amount);
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanId) return;
    
    setLoadingPlan(selectedPlanId);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          planId: selectedPlanId, 
          amount: selectedAmount,
          phone,
          operator,
          country,
          otpCode: otpCode || undefined
        }),
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url; // URL de suivi (attente de validation USSD)
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
        <header className="bg-white border-b border-neutral-100 h-16 px-4 md:px-8 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <span className="font-heading font-extrabold text-2xl text-secondary flex items-center gap-2">
              <img src="/logo.png" alt="Iris" className="h-8 w-8 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              <span>Iris</span>
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-bold text-neutral-600 hover:text-neutral-900">Connexion</Link>
            <Link href="/register" className="bg-secondary hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm">Créer un compte</Link>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className="pt-16 pb-20 max-w-7xl mx-auto px-6 w-full flex-1">
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
              onClick={() => initiatePayment("pack_starter", 1000)}
              disabled={loadingPlan !== null}
              className="w-full bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-900 font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
            >
              Choisir ce plan
            </button>
          </div>

          {/* Plan 2: Creator (Highlighted) */}
          <div className="bg-white rounded-2xl border-2 border-secondary shadow-lg p-8 relative flex flex-col relative transform md:-translate-y-4">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-secondary text-white px-4 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase shadow-md">
              Le plus choisi
            </div>
            
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center mx-auto mb-4 text-orange-500">
                <span className="material-symbols-outlined">description</span>
              </div>
              <h3 className="font-heading text-xl font-extrabold text-neutral-900 mb-2">Creator</h3>
              <p className="text-sm text-neutral-500">Le choix parfait pour les passionnés.</p>
            </div>
            
            <div className="text-center mb-8">
              <div className="font-heading text-3xl font-black text-neutral-900 mb-2">2500 FCFA</div>
              <div className="text-lg font-bold text-neutral-900">3 000 pièces</div>
              <div className="text-[10px] font-bold text-emerald-600 bg-emerald-50 w-max mx-auto px-2 py-0.5 rounded uppercase">+500 BONUS</div>
            </div>
            
            <div className="flex-1">
              <ul className="space-y-4 text-sm text-neutral-600 mb-8">
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-emerald-500 text-lg">check_circle</span>
                  <span>Générer jusqu'à ~150 pages</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-emerald-500 text-lg">check_circle</span>
                  <span>Modèle Standard</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-emerald-500 text-lg">check_circle</span>
                  <span>Modèles IA Avancés</span>
                </li>
                <li className="flex items-center gap-3 opacity-50">
                  <span className="material-symbols-outlined text-neutral-300 text-lg">cancel</span>
                  <span>Couvertures IA Premium</span>
                </li>
              </ul>
            </div>
            
            <button 
              onClick={() => initiatePayment("pack_creator", 2500)}
              disabled={loadingPlan !== null}
              className="w-full bg-secondary hover:bg-orange-600 text-white font-bold py-3.5 rounded-xl transition-colors shadow-md disabled:opacity-50"
            >
              Choisir ce plan
            </button>
          </div>

          {/* Plan 3: Author */}
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-8 flex flex-col relative">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-neutral-100 rounded-xl flex items-center justify-center mx-auto mb-4 text-neutral-600">
                <span className="material-symbols-outlined">emoji_events</span>
              </div>
              <h3 className="font-heading text-xl font-extrabold text-neutral-900 mb-2">Author</h3>
              <p className="text-sm text-neutral-500">L'expérience ultime pour les créateurs.</p>
            </div>
            
            <div className="text-center mb-8">
              <div className="font-heading text-3xl font-black text-neutral-900 mb-2">5000 FCFA</div>
              <div className="text-lg font-bold text-neutral-900">7 000 pièces</div>
              <div className="text-[10px] font-bold text-emerald-600 bg-emerald-50 w-max mx-auto px-2 py-0.5 rounded uppercase">+2000 BONUS</div>
            </div>
            
            <div className="flex-1">
              <ul className="space-y-4 text-sm text-neutral-600 mb-8">
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-emerald-500 text-lg">check_circle</span>
                  <span>Générer jusqu'à ~350 pages</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-emerald-500 text-lg">check_circle</span>
                  <span>Modèle Standard</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-emerald-500 text-lg">check_circle</span>
                  <span>Modèles IA Avancés</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-emerald-500 text-lg">check_circle</span>
                  <span>Couvertures IA Premium</span>
                </li>
              </ul>
            </div>
            
            <button 
              onClick={() => initiatePayment("pack_author", 5000)}
              disabled={loadingPlan !== null}
              className="w-full bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-900 font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
            >
              Choisir ce plan
            </button>
          </div>

        </div>

        {/* Payment Modal — Mobile Money */}
        {selectedPlanId && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 sm:p-7 shadow-2xl max-h-[92dvh] overflow-y-auto">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-xl font-extrabold font-heading text-neutral-900">Paiement Mobile Money</h2>
                <button type="button" onClick={() => setSelectedPlanId(null)} className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:bg-neutral-100">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {/* Récapitulatif */}
              <div className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 mb-5">
                <div>
                  <div className="text-xs font-bold text-neutral-500 uppercase">{selectedPlanId.replace("pack_", "Pack ")}</div>
                  <div className="text-sm font-bold text-neutral-900">
                    {selectedAmount.toLocaleString("fr-FR")} FCFA
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-extrabold text-secondary">
                    {(coinsForPack(selectedPlanId)).toLocaleString("fr-FR")} 🪙
                  </div>
                  <div className="text-[10px] text-neutral-500">crédités après validation</div>
                </div>
              </div>

              <form onSubmit={handleCheckout} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">Pays</label>
                    <select className="w-full border border-neutral-300 rounded-xl p-2.5 text-sm bg-white" value={country} onChange={(e) => setCountry(e.target.value)}>
                      <option value="CI">Côte d'Ivoire</option>
                      <option value="BJ">Bénin</option>
                      <option value="SN">Sénégal</option>
                      <option value="TG">Togo</option>
                      <option value="BF">Burkina Faso</option>
                      <option value="ML">Mali</option>
                      <option value="NE">Niger</option>
                      <option value="GW">Guinée-Bissau</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">Opérateur</label>
                    <select className="w-full border border-neutral-300 rounded-xl p-2.5 text-sm bg-white" value={operator} onChange={(e) => setOperator(e.target.value)}>
                      <option value="ORANGE">Orange Money</option>
                      <option value="MTN">MTN MoMo</option>
                      <option value="MOOV">Moov Money</option>
                      <option value="WAVE">Wave</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">Numéro de téléphone</label>
                  <input type="tel" inputMode="tel" placeholder="Ex: 07 00 00 00 00" className="w-full border border-neutral-300 rounded-xl p-2.5 text-sm" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                </div>

                {operator === "ORANGE" && (
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">Code OTP Orange (si requis)</label>
                    <input type="text" inputMode="numeric" placeholder="Ex: 1234" className="w-full border border-neutral-300 rounded-xl p-2.5 text-sm" value={otpCode} onChange={(e) => setOtpCode(e.target.value)} />
                    <p className="text-[11px] text-neutral-500 mt-1">Composez <strong>#144*82#</strong> pour générer votre code OTP Orange.</p>
                  </div>
                )}

                <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5">
                  <span className="material-symbols-outlined text-blue-500 text-lg">smartphone</span>
                  <p className="text-[11px] text-blue-800 leading-snug">
                    Après avoir cliqué sur <strong>Payer</strong>, une demande de validation sera envoyée sur votre téléphone. <strong>Validez-la</strong> (code PIN mobile money) : vos pièces seront ajoutées automatiquement dès confirmation. Vous pouvez recharger autant de fois que vous voulez, les pièces s'accumulent.
                  </p>
                </div>

                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setSelectedPlanId(null)} className="flex-1 border border-neutral-300 rounded-xl py-2.5 text-sm font-bold text-neutral-600 hover:bg-neutral-50">Annuler</button>
                  <button type="submit" disabled={loadingPlan !== null} className="flex-1 bg-secondary hover:bg-orange-600 text-white rounded-xl py-2.5 text-sm font-bold shadow-sm disabled:opacity-60 flex items-center justify-center gap-2">
                    {loadingPlan ? <span className="material-symbols-outlined text-base animate-spin">progress_activity</span> : <span className="material-symbols-outlined text-base">lock</span>}
                    {loadingPlan ? "Traitement…" : "Payer"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

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

      {!user && <Footer />}
    </div>
  );

  return user ? <AppLayout>{PageContent}</AppLayout> : PageContent;
}
