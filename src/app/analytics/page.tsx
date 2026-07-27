"use client";

import { useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { useUser } from "@/hooks/useUser";

export default function AnalyticsPage() {
  const { displayName, displayEmail, signOut } = useUser();
  const userInitials = displayName ? displayName.substring(0, 2).toUpperCase() : "AU";
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F9FAFB] font-body text-neutral-900 flex flex-col md:flex-row">
      {/* GLOBAL REUSABLE SIDEBAR */}
      <Sidebar />

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-10">
        <header className="bg-[#F9FAFB] sticky top-0 z-30 h-16 px-4 md:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-neutral-600 hover:text-neutral-900 bg-neutral-100 px-3 py-2 rounded-xl transition-all">
              <span className="material-symbols-outlined text-base">arrow_back</span>
              <span>Tableau de bord</span>
            </Link>
            <h1 className="font-heading font-extrabold text-xl text-neutral-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">group</span>
              <span>Lecteurs, Téléchargements & Ventes</span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="w-9 h-9 rounded-full bg-orange-100 border border-orange-300 flex items-center justify-center text-secondary font-extrabold font-heading text-sm cursor-pointer hover:ring-2 hover:ring-orange-300 transition-all"
              >
                {userInitials}
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-neutral-200 py-2 z-50">
                  <div className="px-4 py-3 border-b border-neutral-100">
                    <p className="font-heading font-bold text-sm text-neutral-900">{displayName}</p>
                    <p className="text-xs text-neutral-500 truncate">{displayEmail}</p>
                  </div>
                  <div className="py-1">
                    <Link href="/dashboard" className="flex items-center gap-3 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50">
                      <span className="material-symbols-outlined text-base text-neutral-400">dashboard</span>
                      <span>Tableau de bord</span>
                    </Link>
                    <Link href="/settings" className="flex items-center gap-3 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50">
                      <span className="material-symbols-outlined text-base text-neutral-400">settings</span>
                      <span>Paramètres</span>
                    </Link>
                  </div>
                  <div className="pt-1 border-t border-neutral-100">
                    <Link href="/login" className="flex items-center gap-3 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50">
                      <span className="material-symbols-outlined text-base text-red-500">logout</span>
                      <span>Se déconnecter</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6 md:p-10 max-w-6xl mx-auto w-full space-y-8">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-2xs space-y-2">
              <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">Total Téléchargements</span>
              <p className="font-heading font-extrabold text-3xl text-neutral-900">1 420</p>
              <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">trending_up</span> +18% ce mois-ci
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-2xs space-y-2">
              <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">Mots Générés par l&apos;IA</span>
              <p className="font-heading font-extrabold text-3xl text-secondary">145 400</p>
              <span className="text-xs text-neutral-400 font-medium">Plan Auteur Illimité</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-2xs space-y-2">
              <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">Note Moyenne Lecteurs</span>
              <p className="font-heading font-extrabold text-3xl text-amber-500">4.9 / 5</p>
              <span className="text-xs text-neutral-500 font-medium">Basé sur 128 avis</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-2xs space-y-2">
              <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">Temps Moyen de Lecture</span>
              <p className="font-heading font-extrabold text-3xl text-neutral-900">2h 45m</p>
              <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">check_circle</span> Taux de finition 82%
              </span>
            </div>
          </div>

          {/* Book Performance Table */}
          <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-2xs overflow-hidden">
            <div className="p-6 border-b border-neutral-100 flex justify-between items-center">
              <h2 className="font-heading font-extrabold text-lg text-neutral-900">
                Performance par Livre
              </h2>
              <span className="text-xs text-neutral-400 font-mono">Dernière mise à jour : Aujourd&apos;hui</span>
            </div>

            <div className="divide-y divide-neutral-100">
              {[
                { title: "Les Secrets de la Comptabilité", downloads: 840, rating: "4.9 ⭐", status: "En vente" },
                { title: "Guide du Digital & E-Commerce", downloads: 412, rating: "4.8 ⭐", status: "En vente" },
                { title: "Cuisine & Saveurs d'Afrique de l'Ouest", downloads: 168, rating: "5.0 ⭐", status: "Brouillon" },
              ].map((item, idx) => (
                <div key={idx} className="p-5 flex items-center justify-between gap-4 hover:bg-neutral-50/60 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 text-secondary border border-orange-200 flex items-center justify-center font-bold font-heading">
                      #{idx + 1}
                    </div>
                    <div>
                      <p className="font-heading font-bold text-sm text-neutral-900">{item.title}</p>
                      <p className="text-xs text-neutral-500">{item.downloads} téléchargements effectifs</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-xs font-bold text-amber-500 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                      {item.rating}
                    </span>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
