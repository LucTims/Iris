"use client";

import { useState } from "react";
import { useAdminProjects } from "@/hooks/useAdmin";
import { BookOpen, Search, Loader2 } from "lucide-react";

export default function AdminProjects() {
  const { projects, isLoading, error, mutate } = useAdminProjects();
  const [search, setSearch] = useState("");

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !projects?.length) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-neutral-900 border border-red-200 rounded-2xl text-center space-y-3">
        <p className="font-semibold text-neutral-900 dark:text-neutral-100">Impossible de charger les projets</p>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">{error.message || "Une erreur est survenue lors de la récupération des données."}</p>
        <button
          onClick={() => mutate()}
          className="px-4 py-2 bg-primary text-white text-xs font-semibold rounded-xl hover:bg-[#B83E26] transition-colors"
        >
          Réessayer
        </button>
      </div>
    );
  }

  const filtered = projects.filter((p: any) => 
    p.title?.toLowerCase().includes(search.toLowerCase()) || 
    p.author_email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-neutral-900 dark:text-neutral-100 font-heading">Projets & Livres</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Suivi des {projects.length} livres en cours de rédaction sur la plateforme.</p>
        </div>
        
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Rechercher un livre ou un auteur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-neutral-600 dark:text-neutral-400">
            <thead className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-800 text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Livre</th>
                <th className="px-6 py-4">Auteur</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4 text-center">Progression</th>
                <th className="px-6 py-4 text-center">Pièces dépensées</th>
                <th className="px-6 py-4 text-right">Dernière MàJ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filtered.map((p: any) => (
                <tr key={p.id} className="hover:bg-neutral-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-neutral-900 dark:text-neutral-100">{p.title || 'Sans titre'}</div>
                    <div className="text-xs text-neutral-400 font-mono mt-0.5">{p.id.split('-')[0]}...</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-neutral-900 dark:text-neutral-100">{p.author_name}</div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">{p.author_email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                      {p.status || 'En cours'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="font-bold text-neutral-900 dark:text-neutral-100">{p.chapters} ch.</div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">{p.words.toLocaleString('fr-FR')} mots</div>
                  </td>
                  <td className="px-6 py-4 text-center font-semibold text-secondary">
                    {p.coins_spent.toLocaleString('fr-FR')} <span className="text-[10px]">pts</span>
                  </td>
                  <td className="px-6 py-4 text-right text-xs text-neutral-400">
                    {new Date(p.updated_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-neutral-400">
                    <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    Aucun projet trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}