"use client";

import { useState } from "react";
import { useAdminLedger } from "@/hooks/useAdmin";
import { Cpu, Search, Loader2 } from "lucide-react";

export default function AdminAI() {
  const { ledger, isLoading } = useAdminLedger();
  const [search, setSearch] = useState("");

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  const filtered = ledger.filter((l: any) => 
    l.email?.toLowerCase().includes(search.toLowerCase()) || 
    l.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-neutral-900 font-heading">Surveillance IA & Consommation</h1>
          <p className="text-sm text-neutral-500">Journal des dépenses de pièces et d'utilisation de l'IA.</p>
        </div>
        
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Rechercher (email, action)..."
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
                <th className="px-6 py-4">Utilisateur</th>
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4 text-center">Pièces</th>
                <th className="px-6 py-4 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filtered.map((l: any) => (
                <tr key={l.id} className="hover:bg-neutral-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-neutral-900">{l.name}</div>
                    <div className="text-xs text-neutral-500">{l.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-neutral-800">{l.description || 'Action IA'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                      l.type === 'credit' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-orange-50 text-secondary border border-orange-200'
                    }`}>
                      {l.type === 'credit' ? 'Crédit' : 'Débit'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`font-extrabold ${l.type === 'credit' ? 'text-emerald-600' : 'text-secondary'}`}>
                      {l.type === 'credit' ? '+' : '-'}{l.amount.toLocaleString('fr-FR')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-xs text-neutral-500">
                    {new Date(l.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-neutral-400">
                    <Cpu className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    Aucun log trouvé.
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