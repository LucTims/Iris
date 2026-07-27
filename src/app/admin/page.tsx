"use client";

import Link from "next/link";
import { useUser } from "@/hooks/useUser";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminDashboardPage() {
  const { user, profile, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || profile?.role !== "admin")) {
      router.push("/dashboard");
    }
  }, [user, profile, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user || profile?.role !== "admin") {
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
          <button className="w-full flex items-center gap-3 px-3 py-2 text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-all">
            <span className="material-symbols-outlined">group</span>
            <span className="text-sm">Utilisateurs</span>
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-all">
            <span className="material-symbols-outlined">payments</span>
            <span className="text-sm">Revenus</span>
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-all">
            <span className="material-symbols-outlined">analytics</span>
            <span className="text-sm">Usage IA</span>
          </button>
        </nav>
      </aside>

      {/* Admin Content */}
      <main className="flex-1 p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="font-heading text-3xl font-bold text-on-surface">Tableau de bord Administrateur</h1>
            <p className="text-on-surface-variant mt-1">Vue d&apos;ensemble de la plateforme Iris.</p>
          </div>
          <div className="flex gap-4">
            <Link href="/dashboard" className="text-sm font-semibold text-secondary hover:underline flex items-center gap-1">
              <span className="material-symbols-outlined text-[18px]">exit_to_app</span>
              Quitter l&apos;Admin
            </Link>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl border border-outline-variant shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center">
                <span className="material-symbols-outlined text-secondary">group</span>
              </div>
              <span className="text-xs font-bold text-success-teal bg-success-teal/10 px-2 py-1 rounded">+12%</span>
            </div>
            <p className="text-sm text-on-surface-variant font-semibold">Utilisateurs Actifs</p>
            <p className="text-3xl font-extrabold text-on-surface">12,450</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-outline-variant shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center">
                <span className="material-symbols-outlined text-secondary">auto_stories</span>
              </div>
              <span className="text-xs font-bold text-success-teal bg-success-teal/10 px-2 py-1 rounded">+5%</span>
            </div>
            <p className="text-sm text-on-surface-variant font-semibold">Livres en cours</p>
            <p className="text-3xl font-extrabold text-on-surface">8,321</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-outline-variant shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center">
                <span className="material-symbols-outlined text-secondary">payments</span>
              </div>
              <span className="text-xs font-bold text-success-teal bg-success-teal/10 px-2 py-1 rounded">+18%</span>
            </div>
            <p className="text-sm text-on-surface-variant font-semibold">Revenus MRR (FCFA)</p>
            <p className="text-3xl font-extrabold text-on-surface">4.5M</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-outline-variant shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-full bg-error-container flex items-center justify-center">
                <span className="material-symbols-outlined text-error">warning</span>
              </div>
              <span className="text-xs font-bold text-error bg-error/10 px-2 py-1 rounded">+2%</span>
            </div>
            <p className="text-sm text-on-surface-variant font-semibold">Erreurs IA (Taux)</p>
            <p className="text-3xl font-extrabold text-on-surface">0.4%</p>
          </div>
        </div>

        {/* Recent Users Table */}
        <div className="bg-white rounded-2xl border border-outline-variant shadow-sm overflow-hidden">
          <div className="p-6 border-b border-outline-variant flex justify-between items-center">
            <h3 className="font-heading text-lg font-bold text-on-surface">Derniers Inscrits</h3>
            <button className="text-sm text-secondary font-semibold hover:underline">Voir tout</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-container-lowest text-on-surface-variant text-sm border-b border-outline-variant">
                <tr>
                  <th className="px-6 py-4 font-semibold">Utilisateur</th>
                  <th className="px-6 py-4 font-semibold">Email</th>
                  <th className="px-6 py-4 font-semibold">Plan</th>
                  <th className="px-6 py-4 font-semibold">Date d&apos;inscription</th>
                  <th className="px-6 py-4 font-semibold">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant text-sm">
                <tr>
                  <td className="px-6 py-4 font-semibold text-on-surface">Aminata Diallo</td>
                  <td className="px-6 py-4 text-on-surface-variant">aminata.d@example.com</td>
                  <td className="px-6 py-4"><span className="bg-secondary/10 text-secondary font-bold px-2 py-1 rounded text-xs">Auteur Pro</span></td>
                  <td className="px-6 py-4 text-on-surface-variant">Il y a 10 min</td>
                  <td className="px-6 py-4"><span className="text-success-teal font-bold">Actif</span></td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-semibold text-on-surface">Koffi Kouassi</td>
                  <td className="px-6 py-4 text-on-surface-variant">koffi.k@example.com</td>
                  <td className="px-6 py-4"><span className="bg-surface-container-high text-on-surface-variant font-bold px-2 py-1 rounded text-xs">Découverte</span></td>
                  <td className="px-6 py-4 text-on-surface-variant">Il y a 1 heure</td>
                  <td className="px-6 py-4"><span className="text-success-teal font-bold">Actif</span></td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-semibold text-on-surface">Fatou Diop</td>
                  <td className="px-6 py-4 text-on-surface-variant">fatou.d@example.com</td>
                  <td className="px-6 py-4"><span className="bg-warning-amber/10 text-warning-amber font-bold px-2 py-1 rounded text-xs">Maison d&apos;Édition</span></td>
                  <td className="px-6 py-4 text-on-surface-variant">Il y a 3 heures</td>
                  <td className="px-6 py-4"><span className="text-success-teal font-bold">Actif</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
