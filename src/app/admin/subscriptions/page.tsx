"use client";

import React, { useState } from "react";
import {
  Receipt,
  DollarSign,
  TrendingUp,
  CreditCard,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { mockSubscriptionRecords, mockKPIData } from "@/lib/admin/mockData";

export default function AdminSubscriptionsPage() {
  const [subscriptions] = useState(mockSubscriptionRecords);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredSubs = subscriptions.filter((sub) => {
    const matchesSearch =
      sub.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.user_email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || sub.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <Receipt className="w-8 h-8 text-emerald-400" />
            Abonnements & Revenus Récurrents
          </h1>
          <p className="text-neutral-400 text-sm mt-1">
            Supervision du MRR, passerelle SebPay (Wave / Orange Money / MTN) et facturation.
          </p>
        </div>
      </div>

      {/* Financial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-4">
          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">MRR Actuel</span>
          <div className="text-2xl font-black text-emerald-400 mt-1">
            {mockKPIData.mrr_fcfa.toLocaleString("fr-FR")} <span className="text-xs text-neutral-400">FCFA</span>
          </div>
          <div className="text-xs text-emerald-400 mt-1 flex items-center gap-1 font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            +{mockKPIData.mrr_growth_pct}% ce mois
          </div>
        </div>

        <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-4">
          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">ARR Estimé</span>
          <div className="text-2xl font-black text-white mt-1">
            {((mockKPIData.mrr_fcfa * 12) / 1000000).toFixed(1)}M <span className="text-xs text-neutral-400">FCFA</span>
          </div>
          <div className="text-xs text-neutral-500 mt-1">Revenu Annuel Récurrent Projeté</div>
        </div>

        <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-4">
          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">ARPU Moyen</span>
          <div className="text-2xl font-black text-orange-400 mt-1">
            18,500 <span className="text-xs text-neutral-400">FCFA</span>
          </div>
          <div className="text-xs text-neutral-500 mt-1">Revenu Moyen par Utilisateur Payant</div>
        </div>

        <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-4">
          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Taux d'Attrition (Churn)</span>
          <div className="text-2xl font-black text-white mt-1">1.8%</div>
          <div className="text-xs text-emerald-400 mt-1 font-medium">Faible désabonnement</div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher par nom ou email d'abonné..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-neutral-900 px-3 py-2 rounded-xl border border-neutral-800">
            <span className="text-xs font-semibold text-neutral-400">Statut :</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs font-medium text-white focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-neutral-900">Tous les abonnements</option>
              <option value="active" className="bg-neutral-900">Actif</option>
              <option value="past_due" className="bg-neutral-900">En retard</option>
              <option value="canceled" className="bg-neutral-900">Annulé</option>
            </select>
          </div>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-neutral-300">
            <thead className="bg-neutral-900/80 text-xs font-semibold uppercase text-neutral-400 tracking-wider border-b border-neutral-800">
              <tr>
                <th className="px-6 py-4">Abonné</th>
                <th className="px-4 py-4">Plan</th>
                <th className="px-4 py-4">Montant Récurrent</th>
                <th className="px-4 py-4">Moyen de Paiement</th>
                <th className="px-4 py-4">Statut</th>
                <th className="px-6 py-4 text-right">Prochain Prélèvement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900">
              {filteredSubs.map((sub) => (
                <tr key={sub.id} className="hover:bg-neutral-900/50">
                  <td className="px-6 py-4">
                    <div className="font-bold text-white">{sub.user_name}</div>
                    <div className="text-xs text-neutral-500 font-mono">{sub.user_email}</div>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                        sub.plan === "studio"
                          ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                          : "bg-orange-500/20 text-orange-300 border border-orange-500/30"
                      }`}
                    >
                      {sub.plan}
                    </span>
                  </td>
                  <td className="px-4 py-4 font-bold text-white">
                    {sub.amount_fcfa.toLocaleString("fr-FR")} FCFA / mois
                  </td>
                  <td className="px-4 py-4">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-neutral-900 border border-neutral-800 text-neutral-300 uppercase">
                      {sub.provider}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${
                        sub.status === "active"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : sub.status === "past_due"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : "bg-neutral-800 text-neutral-400"
                      }`}
                    >
                      {sub.status === "active" && <CheckCircle2 className="w-3 h-3" />}
                      {sub.status === "past_due" && <AlertTriangle className="w-3 h-3" />}
                      {sub.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-xs text-neutral-400">
                    {new Date(sub.current_period_end).toLocaleDateString("fr-FR")}
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
