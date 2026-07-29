"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { useUser } from "@/hooks/useUser";
import { createClient } from "@/lib/supabase/client";

export default function BillingPage() {
  const { user } = useUser();
  const supabase = createClient();

  const [usageCount, setUsageCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<"orange" | "mtn" | "wave" | "card">("orange");
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    async function loadUsage() {
      if (!user) return;
      try {
        const { count, error } = await supabase
          .from("ai_usage")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id);

        if (!error && count !== null) {
          setUsageCount(count);
        }
      } catch (err) {
        console.error("Erreur de chargement d'usage:", err);
      } finally {
        setLoading(false);
      }
    }
    loadUsage();
  }, [user]);

  const handleMobileMoneyPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentSuccess(true);
    setTimeout(() => {
      setPaymentSuccess(false);
      setIsPaymentModalOpen(false);
      alert("Paiement initié avec succès ! Veuillez valider le sous-menu USSD sur votre téléphone.");
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] font-body text-neutral-900 flex flex-col md:flex-row">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-10">
        <header className="bg-white border-b border-neutral-200/80 sticky top-0 z-30 h-16 px-4 md:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-neutral-600 hover:text-neutral-900 bg-neutral-100 px-3 py-2 rounded-xl transition-all">
              <span className="material-symbols-outlined text-base">arrow_back</span>
              <span>Tableau de bord</span>
            </Link>
            <h1 className="font-heading font-extrabold text-xl text-neutral-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">credit_card</span>
              <span>Abonnement &amp; Facturation (FCFA)</span>
            </h1>
          </div>
        </header>

        <main className="p-4 sm:p-6 md:p-10 max-w-5xl mx-auto w-full space-y-8">
          <div className="flex flex-col md:flex-row gap-8">
            <aside className="w-full md:w-64 space-y-1">
              <Link href="/settings" className="w-full flex items-center gap-3 px-4 py-3 text-neutral-600 hover:bg-neutral-100 rounded-xl font-medium text-xs">
                <span className="material-symbols-outlined text-lg">person</span>
                <span>Profil</span>
              </Link>
              <button className="w-full flex items-center gap-3 px-4 py-3 bg-neutral-900 text-white rounded-xl font-bold text-xs">
                <span className="material-symbols-outlined text-lg">credit_card</span>
                <span>Abonnement &amp; Mots</span>
              </button>
            </aside>

            <main className="flex-1 space-y-6">
              {/* Plan Box */}
              <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-2xs overflow-hidden p-6 sm:p-8 space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="inline-block py-1 px-3 rounded-full bg-orange-50 text-secondary border border-orange-200 text-[10px] font-bold tracking-wider mb-2">
                      PLAN ACTUEL
                    </span>
                    <h2 className="font-heading text-2xl font-extrabold text-neutral-900">Auteur Pro</h2>
                    <p className="text-xs font-bold text-secondary mt-0.5">4 900 FCFA / mois</p>
                  </div>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">Actif</span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Requêtes &amp; Mots IA Générés (Total)</span>
                    <span className="text-secondary font-bold">{usageCount} générations IA</span>
                  </div>
                  <div className="w-full h-2.5 bg-neutral-100 rounded-full overflow-hidden">
                    <div className="h-full bg-secondary rounded-full" style={{ width: `${Math.min(usageCount * 5, 100)}%` }}></div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    onClick={() => setIsPaymentModalOpen(true)}
                    className="bg-secondary text-white text-xs font-bold px-5 py-2.5 rounded-xl hover:bg-orange-600 transition-colors shadow-2xs cursor-pointer flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-base">smartphone</span>
                    <span>Recharger / Payer par Mobile Money</span>
                  </button>
                </div>
              </div>

              {/* Payment Methods Available Card */}
              <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-2xs p-6 space-y-4">
                <h3 className="font-heading font-bold text-base text-neutral-900">Moyens de Paiement Acceptés</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 border border-neutral-200 rounded-xl flex items-center justify-center font-bold text-xs text-orange-600 bg-orange-50/50">
                    Orange Money
                  </div>
                  <div className="p-3 border border-neutral-200 rounded-xl flex items-center justify-center font-bold text-xs text-yellow-600 bg-yellow-50/50">
                    MTN MoMo
                  </div>
                  <div className="p-3 border border-neutral-200 rounded-xl flex items-center justify-center font-bold text-xs text-blue-600 bg-blue-50/50">
                    Wave FCFA
                  </div>
                  <div className="p-3 border border-neutral-200 rounded-xl flex items-center justify-center font-bold text-xs text-neutral-700 bg-neutral-50">
                    Carte Visa / MC
                  </div>
                </div>
              </div>
            </main>
          </div>
        </main>

        {/* Mobile Money Payment Modal */}
        {isPaymentModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-6 shadow-2xl animate-in fade-in">
              <div className="flex justify-between items-center">
                <h3 className="font-heading font-extrabold text-lg text-neutral-900">Paiement Mobile Money</h3>
                <button onClick={() => setIsPaymentModalOpen(false)} className="text-neutral-400 hover:text-neutral-700">
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>

              <form onSubmit={handleMobileMoneyPayment} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-2 uppercase">Choisissez votre opérateur</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedPayment("orange")}
                      className={`p-3 rounded-xl border font-bold text-xs text-center transition-all ${selectedPayment === "orange" ? "border-orange-500 bg-orange-50 text-orange-600" : "border-neutral-200"}`}
                    >
                      Orange Money
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedPayment("mtn")}
                      className={`p-3 rounded-xl border font-bold text-xs text-center transition-all ${selectedPayment === "mtn" ? "border-yellow-500 bg-yellow-50 text-yellow-700" : "border-neutral-200"}`}
                    >
                      MTN MoMo
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedPayment("wave")}
                      className={`p-3 rounded-xl border font-bold text-xs text-center transition-all ${selectedPayment === "wave" ? "border-blue-500 bg-blue-50 text-blue-600" : "border-neutral-200"}`}
                    >
                      Wave FCFA
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1.5 uppercase">Numéro de Téléphone *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+225 07 00 00 00 00"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 text-sm font-medium focus:border-secondary outline-none"
                  />
                </div>

                <div className="bg-neutral-50 p-4 rounded-xl text-xs space-y-1">
                  <div className="flex justify-between font-bold text-neutral-900">
                    <span>Montant total :</span>
                    <span className="text-secondary">4 900 FCFA</span>
                  </div>
                  <p className="text-neutral-500 text-[11px]">Facturé mensuellement. Résiliation sans frais à tout moment.</p>
                </div>

                <button
                  type="submit"
                  disabled={paymentSuccess}
                  className="w-full bg-secondary hover:bg-orange-600 text-white font-bold text-xs py-3.5 rounded-xl transition-all shadow-sm cursor-pointer"
                >
                  {paymentSuccess ? "Initiation..." : "Payer 4 900 FCFA par Mobile Money"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

