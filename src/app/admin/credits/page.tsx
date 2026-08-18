"use client";

import React, { useState } from "react";
import {
  Coins,
  PlusCircle,
  History,
  Sparkles,
  CheckCircle2,
  Users,
  Award,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import { mockCreditTransactions, mockAdminUsers } from "@/lib/admin/mockData";
import { AdminCreditTransaction } from "@/lib/admin/types";

export default function AdminCreditsPage() {
  const [transactions, setTransactions] = useState<AdminCreditTransaction[]>(mockCreditTransactions);
  const [selectedUserId, setSelectedUserId] = useState<string>(mockAdminUsers[0]?.id || "");
  const [amountWords, setAmountWords] = useState<number>(10000);
  const [reason, setReason] = useState<string>("Bonus promotionnel concours littéraire");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleGrantCredits = (e: React.FormEvent) => {
    e.preventDefault();
    const user = mockAdminUsers.find((u) => u.id === selectedUserId);
    if (!user) return;

    const newTx: AdminCreditTransaction = {
      id: `crd_${Date.now()}`,
      user_id: user.id,
      user_email: user.email,
      amount_words: Number(amountWords),
      type: "grant",
      reason: reason || "Attribution manuelle administrateur",
      admin_email: "amadou.diallo@iris-editions.com",
      timestamp: new Date().toISOString(),
    };

    setTransactions([newTx, ...transactions]);
    setToastMessage(`+${amountWords.toLocaleString("fr-FR")} mots crédités avec succès à ${user.full_name} !`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-neutral-900 border border-emerald-500/50 text-emerald-300 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-sm font-medium animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <Coins className="w-8 h-8 text-amber-400" />
            Crédits & Gestion des Quotas
          </h1>
          <p className="text-neutral-400 text-sm mt-1">
            Attribution manuelle de soldes de mots, quotas par palier et grand livre des recharges.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-4">
          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Mots Alloués ce mois</span>
          <div className="text-2xl font-black text-white mt-1">4.25M mots</div>
          <div className="text-xs text-neutral-500 mt-1">Forfaits Pro & Studio actifs</div>
        </div>
        <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-4">
          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Crédits Bonus Accordés</span>
          <div className="text-2xl font-black text-amber-400 mt-1">100k mots</div>
          <div className="text-xs text-neutral-500 mt-1">Attributions administratives manuelles</div>
        </div>
        <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-4">
          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Quota Gratuit Quotidien</span>
          <div className="text-2xl font-black text-white mt-1">10,000 mots</div>
          <div className="text-xs text-neutral-500 mt-1">Réinitialisation automatique à minuit</div>
        </div>
        <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-4">
          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Taux d'Épuisement Quota</span>
          <div className="text-2xl font-black text-emerald-400 mt-1">14.2%</div>
          <div className="text-xs text-neutral-500 mt-1">Utilisateurs ayant rechargé</div>
        </div>
      </div>

      {/* Manual Grant Tool & Quota Tier Rules */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Manual Grant Form (2 cols) */}
        <div className="lg:col-span-2 bg-neutral-950 border border-neutral-800/80 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
            <PlusCircle className="w-5 h-5 text-amber-400" />
            Accorder des Crédits Mots à un Auteur
          </h2>
          <p className="text-xs text-neutral-400 mb-6">
            Créditez instantanément un compte utilisateur sans déclencher de facturation SebPay.
          </p>

          <form onSubmit={handleGrantCredits} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Sélectionner l'Auteur Bénéficiaire
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
              >
                {mockAdminUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name} ({user.email}) — Plan {user.plan.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Montant en Mots à Créditer
                </label>
                <input
                  type="number"
                  step="1000"
                  min="1000"
                  max="500000"
                  value={amountWords}
                  onChange={(e) => setAmountWords(Number(e.target.value))}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Motif de l'Attribution
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ex : Récompense concours, dédommagement..."
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Créditer le Solde Maintenant
              </button>
            </div>
          </form>
        </div>

        {/* Quota Rules Reference (1 col) */}
        <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-white mb-1">Paliers & Quotas Iris</h2>
            <p className="text-xs text-neutral-400 mb-4">Règles d'allocation par forfait</p>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-900">
                <div className="font-bold text-white flex items-center justify-between">
                  <span>Palier FREE</span>
                  <span className="text-neutral-400">10k mots / j</span>
                </div>
                <div className="text-neutral-500 mt-1">Gemini 2.5 Flash, réinitialisation quotidienne</div>
              </div>

              <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-900">
                <div className="font-bold text-orange-400 flex items-center justify-between">
                  <span>Palier PRO</span>
                  <span className="text-white">50k mots / mois</span>
                </div>
                <div className="text-neutral-500 mt-1">Gemini Flash & Pro, export ePub / PDF inclus</div>
              </div>

              <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-900">
                <div className="font-bold text-purple-400 flex items-center justify-between">
                  <span>Palier STUDIO</span>
                  <span className="text-white">200k mots prioritaire</span>
                </div>
                <div className="text-neutral-500 mt-1">Génération de couvertures Imagen 3 & accès direct API</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Credit Transactions Ledger Table */}
      <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
          <History className="w-5 h-5 text-neutral-400" />
          Grand Livre des Transactions de Crédits
        </h2>
        <p className="text-xs text-neutral-400 mb-4">Historique des allocations et recharges manuelles</p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-neutral-300">
            <thead className="bg-neutral-900/80 text-xs font-semibold uppercase text-neutral-400 tracking-wider border-b border-neutral-800">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Auteur (Bénéficiaire)</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Mots Alloués</th>
                <th className="px-4 py-3">Motif</th>
                <th className="px-4 py-3 text-right">Opérateur</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-neutral-900/50">
                  <td className="px-4 py-3 text-xs text-neutral-400">
                    {new Date(tx.timestamp).toLocaleString("fr-FR")}
                  </td>
                  <td className="px-4 py-3 font-medium text-white">{tx.user_email}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-neutral-800 text-neutral-300">
                      {tx.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold text-amber-400">
                    +{tx.amount_words.toLocaleString("fr-FR")} mots
                  </td>
                  <td className="px-4 py-3 text-xs text-neutral-300">{tx.reason}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-neutral-500">
                    {tx.admin_email}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
