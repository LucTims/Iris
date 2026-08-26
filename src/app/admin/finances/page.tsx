"use client";

import { useState } from "react";
import { useAdminTransactions } from "@/hooks/useAdmin";
import { Receipt, Search, Loader2 } from "lucide-react";

export default function AdminFinances() {
  const { transactions, isLoading } = useAdminTransactions();
  const [search, setSearch] = useState("");

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  const filtered = transactions.filter((t: any) => 
    t.email?.toLowerCase().includes(search.toLowerCase()) || 
    t.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-neutral-900 font-heading">Finances & SEBPay</h1>
          <p className="text-sm text-neutral-500">Historique des achats de pièces via Mobile Money.</p>
        </div>
        
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Rechercher une transaction ou un email..."
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
                <th className="px-6 py-4">Pack Acheté</th>
                <th className="px-6 py-4">Montant</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filtered.map((t: any) => (
                <tr key={t.id} className="hover:bg-neutral-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-neutral-900">{t.name}</div>
                    <div className="text-xs text-neutral-500">{t.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex px-2 py-1 rounded bg-neutral-100 text-neutral-700 font-mono text-xs">
                      {t.plan_id || 'Pack'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-extrabold text-neutral-900">{t.amount.toLocaleString('fr-FR')} {t.currency}</div>
                    <div className="text-[10px] text-neutral-400 font-mono mt-0.5">Ref: {t.provider_reference || t.id.split('-')[0]}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                      t.status === 'paid' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                      t.status === 'pending' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                      'bg-red-50 text-red-600 border border-red-200'
                    }`}>
                      {t.status === 'paid' ? 'Payé' : t.status === 'pending' ? 'En attente' : 'Échoué'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-xs text-neutral-500">
                    {new Date(t.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-neutral-400">
                    <Receipt className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    Aucune transaction trouvée.
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