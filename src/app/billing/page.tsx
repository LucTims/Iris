"use client";

import { useEffect } from "react";
import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import { useUser } from "@/hooks/useUser";
import { useRouter } from "next/navigation";

export default function BillingPage() {
  const { user, walletBalance, refreshWalletBalance, isLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    refreshWalletBalance();
  }, []);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex h-[50vh] items-center justify-center">
          <span className="material-symbols-outlined animate-spin text-4xl text-secondary">progress_activity</span>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <header className="bg-white border-b border-neutral-200/80 sticky top-0 z-20 h-16 px-4 md:px-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-neutral-600 hover:text-neutral-900 bg-neutral-100 px-3 py-2 rounded-xl transition-all">
            <span className="material-symbols-outlined text-base">arrow_back</span>
            <span>Tableau de bord</span>
          </Link>
          <h1 className="font-heading font-extrabold text-xl text-neutral-900 flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">account_balance_wallet</span>
            <span>Portefeuille &amp; Pièces</span>
          </h1>
        </div>
      </header>

      <main className="p-4 sm:p-6 md:p-10 max-w-5xl mx-auto w-full space-y-8">
        <div className="flex flex-col gap-8">


          <main className="flex-1 space-y-6">
            {/* Wallet Box */}
            <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-2xs overflow-hidden p-6 sm:p-8 space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <span className="inline-block py-1 px-3 rounded-full bg-orange-50 text-secondary border border-orange-200 text-[10px] font-bold tracking-wider mb-2 uppercase">
                    Solde Actuel
                  </span>
                  <h2 className="font-heading text-4xl font-extrabold text-neutral-900">{walletBalance}</h2>
                  <p className="text-xs font-bold text-neutral-500 mt-1">Pièces Iris (sans date d'expiration)</p>
                </div>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">Pay-as-you-go</span>
              </div>

              <div className="bg-neutral-50 p-4 rounded-xl text-sm text-neutral-600 border border-neutral-100">
                <p>Vos pièces sont utilisées pour payer la génération de chapitres, de texte, et de couvertures via notre IA. Vous ne payez que ce que vous consommez.</p>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <Link href="/pricing" className="bg-secondary text-white text-sm font-bold px-6 py-3 rounded-xl hover:bg-orange-600 transition-colors shadow-2xs flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">add_circle</span>
                  <span>Acheter des pièces</span>
                </Link>
              </div>
            </div>

            {/* Informations Card */}
            <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-2xs p-6 space-y-4">
              <h3 className="font-heading font-bold text-base text-neutral-900">Moyens de Paiement Acceptés sur SebPay</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 border border-neutral-200 rounded-xl flex items-center justify-center font-bold text-xs text-orange-600 bg-orange-50/50">
                  Orange Money
                </div>
                <div className="p-3 border border-neutral-200 rounded-xl flex items-center justify-center font-bold text-xs text-yellow-600 bg-yellow-50/50">
                  MTN MoMo
                </div>
                <div className="p-3 border border-neutral-200 rounded-xl flex items-center justify-center font-bold text-xs text-blue-600 bg-blue-50/50">
                  Moov Money
                </div>
                <div className="p-3 border border-neutral-200 rounded-xl flex items-center justify-center font-bold text-xs text-neutral-700 bg-neutral-50">
                  Carte Visa / MC
                </div>
              </div>
            </div>
          </main>
        </div>
      </main>
    </AppLayout>
  );
}
