"use client";

import Link from "next/link";
import { useUser } from "@/hooks/useUser";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AdminDashboardPage() {
  const { user, profile, isAdmin, loading, displayEmail } = useUser();
  const router = useRouter();
  const supabase = createClient();

  const [stats, setStats] = useState({
    usersCount: 0,
    projectsCount: 0,
    aiUsageCount: 0,
  });

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.push("/dashboard");
    }
  }, [user, isAdmin, loading, router]);

  useEffect(() => {
    async function loadAdminStats() {
      if (!user || !isAdmin) return;
      try {
        const [usersRes, projRes, aiRes] = await Promise.all([
          supabase.from("profiles").select("*", { count: "exact", head: true }),
          supabase.from("projects").select("*", { count: "exact", head: true }),
          supabase.from("ai_usage").select("*", { count: "exact", head: true })
        ]);

        setStats({
          usersCount: usersRes.count || 1,
          projectsCount: projRes.count || 0,
          aiUsageCount: aiRes.count || 0
        });
      } catch (err) {
        console.error("Erreur admin metrics:", err);
      }
    }
    loadAdminStats();
  }, [user, isAdmin]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }
  return (
    <div className="min-h-screen flex bg-surface-container-lowest">
      {/* Admin Sidebar */}
      <aside className="w-64 bg-surface-container-low hidden lg:flex flex-col border-r border-outline-variant h-screen sticky top-0">
        <div className="p-6 border-b border-outline-variant">
          <Link href="/" className="font-heading text-2xl font-extrabold text-secondary">Iris</Link>
          <span className="block text-xs font-mono font-bold text-error mt-1 uppercase tracking-widest">Administration</span>
        </div>
        
        <nav className="flex-1 space-y-1 p-4">
          <button className="w-full flex items-center gap-3 px-3 py-2 bg-secondary-container text-on-secondary-container rounded-lg font-bold transition-all">
            <span className="material-symbols-outlined">dashboard</span>
            <span className="text-sm">Vue globale</span>
          </button>
          <Link href="/dashboard" className="w-full flex items-center gap-3 px-3 py-2 text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-all">
            <span className="material-symbols-outlined">arrow_back</span>
            <span className="text-sm">Retour App</span>
          </Link>
        </nav>
      </aside>

      {/* Admin Content */}
      <main className="flex-1 p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Panneau d&apos;Administration Iris</h1>
          <span className="text-xs font-mono bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full font-bold">Supabase Realtime DB</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-secondary">group</span>
              </div>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">Réel</span>
            </div>
            <span className="text-xs font-bold text-neutral-500 uppercase">Utilisateurs Inscrits</span>
            <p className="text-4xl font-black text-neutral-900 mt-2">{stats.usersCount}</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-secondary">auto_stories</span>
              </div>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">Réel</span>
            </div>
            <span className="text-xs font-bold text-neutral-500 uppercase">Projets de Livres Total</span>
            <p className="text-4xl font-black text-secondary mt-2">{stats.projectsCount}</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-secondary">psychology</span>
              </div>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">Réel</span>
            </div>
            <span className="text-xs font-bold text-neutral-500 uppercase">Appels / Générations IA</span>
            <p className="text-4xl font-black text-emerald-600 mt-2">{stats.aiUsageCount}</p>
          </div>
        </div>
      </main>
    </div>
  );
}
