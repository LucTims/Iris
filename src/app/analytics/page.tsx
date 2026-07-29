"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { useUser } from "@/hooks/useUser";
import { createClient } from "@/lib/supabase/client";

export default function AnalyticsPage() {
  const { user, displayName, displayEmail, signOut } = useUser();
  const userInitials = displayName ? displayName.substring(0, 2).toUpperCase() : "AU";
  const supabase = createClient();

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [aiUsageCount, setAiUsageCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMetrics() {
      if (!user) return;
      try {
        const [projRes, usageRes] = await Promise.all([
          fetch("/api/projects"),
          supabase.from("ai_usage").select("*", { count: "exact", head: true }).eq("user_id", user.id)
        ]);

        if (projRes.ok) {
          const projData = await projRes.json();
          setProjects(projData.projects || []);
        }

        if (usageRes.count !== null) {
          setAiUsageCount(usageRes.count || 0);
        }
      } catch (err) {
        console.error("Erreur d'analytics:", err);
      } finally {
        setLoading(false);
      }
    }
    loadMetrics();
  }, [user]);

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
              <span className="material-symbols-outlined text-secondary">analytics</span>
              <span>Statistiques &amp; Performance</span>
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
                    <button onClick={signOut} className="w-full text-left flex items-center gap-3 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50">
                      <span className="material-symbols-outlined text-base text-red-500">logout</span>
                      <span>Se déconnecter</span>
                    </button>
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
              <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">Projets de Livres</span>
              <p className="font-heading font-extrabold text-3xl text-neutral-900">{projects.length}</p>
              <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">check_circle</span> Enregistrés dans Supabase
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-2xs space-y-2">
              <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">Générations IA</span>
              <p className="font-heading font-extrabold text-3xl text-secondary">{aiUsageCount}</p>
              <span className="text-xs text-neutral-400 font-medium">Historique en temps réel</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-2xs space-y-2">
              <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">Note Moyenne Lecteurs</span>
              <p className="font-heading font-extrabold text-3xl text-amber-500">5.0 / 5</p>
              <span className="text-xs text-neutral-500 font-medium">Iris Co-création</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-2xs space-y-2">
              <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">Statut du Compte</span>
              <p className="font-heading font-extrabold text-3xl text-neutral-900">Actif</p>
              <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">verified</span> Authentifié
              </span>
            </div>
          </div>

          {/* Book Performance Table */}
          <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-2xs overflow-hidden">
            <div className="p-6 border-b border-neutral-100 flex justify-between items-center">
              <h2 className="font-heading font-extrabold text-lg text-neutral-900">
                Performance de vos Livres
              </h2>
              <span className="text-xs text-neutral-400 font-mono">Supabase Realtime</span>
            </div>

            <div className="divide-y divide-neutral-100">
              {projects.length === 0 ? (
                <div className="p-8 text-center text-neutral-500 text-sm font-medium">
                  Aucun projet de livre trouvé pour l&apos;instant. <Link href="/projects/new" className="text-secondary font-bold underline">Créer votre premier livre</Link>
                </div>
              ) : (
                projects.map((item, idx) => (
                  <div key={item.id || idx} className="p-5 flex items-center justify-between gap-4 hover:bg-neutral-50/60 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-50 text-secondary border border-orange-200 flex items-center justify-center font-bold font-heading">
                        #{idx + 1}
                      </div>
                      <div>
                        <p className="font-heading font-bold text-sm text-neutral-900">{item.title}</p>
                        <p className="text-xs text-neutral-500">{item.subtitle || item.category || "Projet de livre"}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                        {item.status || "En cours"}
                      </span>
                      <Link href={`/redaction?projectId=${item.id}`}>
                        <button className="bg-neutral-100 hover:bg-secondary hover:text-white text-neutral-800 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">
                          Rédiger
                        </button>
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

