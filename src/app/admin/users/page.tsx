"use client";

import { useState } from "react";
import { useAdminUsers } from "@/hooks/useAdmin";
import { Users, Search, Loader2, ShieldAlert } from "lucide-react";

const fmt = (n: number) => (Number(n) || 0).toLocaleString("fr-FR");

export default function AdminUsersPage() {
  const { users, isLoading, error, mutate } = useAdminUsers();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const changePlan = async (userId: string, newPlan: string) => {
    setLoadingId(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, newPlan }),
      });
      const data = await res.json();
      if (data.success) {
        mutate();
      } else {
        alert("Erreur : " + data.error);
      }
    } catch {
      alert("Erreur de connexion.");
    } finally {
      setLoadingId(null);
    }
  };

  if (isLoading && !users?.length) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  const filtered = (users || []).filter((u: any) => 
    u.email?.toLowerCase().includes(search.toLowerCase()) || 
    u.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-neutral-900 font-heading">Gestion des Utilisateurs</h1>
          <p className="text-sm text-neutral-500">Contrôle des profils, pièces et accès de {users?.length || 0} utilisateurs.</p>
        </div>
        
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Rechercher par nom ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
          />
        </div>
      </div>

      <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-neutral-600">
            <thead className="bg-neutral-50 border-b border-neutral-200 text-xs font-bold text-neutral-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Auteur / Email</th>
                <th className="px-6 py-4">Rôle</th>
                <th className="px-6 py-4 text-center">Plan</th>
                <th className="px-6 py-4">Solde</th>
                <th className="px-6 py-4 text-center">Dépenses</th>
                <th className="px-6 py-4 text-center">Livres</th>
                <th className="px-6 py-4 text-right">Inscription</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filtered.map((u: any) => (
                <tr key={u.id} className="hover:bg-neutral-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-xs shrink-0">
                        {u.full_name ? u.full_name.charAt(0).toUpperCase() : u.email?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-neutral-900">{u.full_name || 'Anonyme'}</div>
                        <div className="text-xs text-neutral-500">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {u.role === 'admin' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-600 border border-purple-200">
                        <ShieldAlert className="w-3 h-3" /> Admin
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-neutral-100 text-neutral-600 border border-neutral-200">
                        Auteur
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center items-center gap-2">
                      <select
                        className="border border-neutral-300 rounded-lg px-2 py-1 text-xs outline-none bg-white text-neutral-700 focus:ring-2 focus:ring-orange-500/20"
                        value={u.plan || "free"}
                        onChange={(e) => changePlan(u.id, e.target.value)}
                        disabled={loadingId === u.id}
                      >
                        <option value="free">Free</option>
                        <option value="pro">Pro</option>
                        <option value="studio">Studio</option>
                      </select>
                      {loadingId === u.id && (
                        <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-extrabold text-neutral-900">{fmt(u.balance)} <span className="text-xs text-neutral-400 font-normal">pts</span></div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="font-semibold text-secondary">{fmt(u.coins_spent)}</span>
                  </td>
                  <td className="px-6 py-4 text-center font-bold text-neutral-700">
                    {fmt(u.projects)}
                  </td>
                  <td className="px-6 py-4 text-right text-xs text-neutral-500">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : "-"}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-neutral-400">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    Aucun utilisateur trouvé.
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