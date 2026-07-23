"use client";

import Link from "next/link";
import Sidebar from "@/components/Sidebar";

export default function BillingPage() {
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
              <span>Abonnement & Facturation</span>
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
                <span>Abonnement & Mots</span>
              </button>
            </aside>

            <main className="flex-1 space-y-6">
              <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-2xs overflow-hidden p-6 sm:p-8 space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="inline-block py-1 px-3 rounded-full bg-orange-50 text-secondary border border-orange-200 text-[10px] font-bold tracking-wider mb-2">
                      PLAN ACTUEL
                    </span>
                    <h2 className="font-heading text-2xl font-extrabold text-neutral-900">Auteur Pro</h2>
                    <p className="text-xs text-neutral-500 mt-0.5">4 900 FCFA / mois</p>
                  </div>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">Actif</span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Quota Mots Générés IA (Mois en cours)</span>
                    <span className="text-secondary font-bold">145,400 mots / Illimité</span>
                  </div>
                  <div className="w-full h-2.5 bg-neutral-100 rounded-full overflow-hidden">
                    <div className="h-full bg-secondary rounded-full w-[45%]"></div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Link href="/pricing" className="bg-secondary text-white text-xs font-bold px-5 py-2.5 rounded-xl hover:bg-orange-600 transition-colors shadow-2xs">
                    Changer de Forfait
                  </Link>
                </div>
              </div>
            </main>
          </div>
        </main>
      </div>
    </div>
  );
}
