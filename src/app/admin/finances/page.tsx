"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw,
  Receipt,
  ArrowUpRight,
  ExternalLink,
  Coins,
  ShieldCheck,
  Calendar,
  User,
  X,
  AlertTriangle,
} from "lucide-react";
import { mockAdminTransactions } from "@/lib/admin/mockData";
import { AdminTransaction, TransactionStatus } from "@/lib/admin/types";
import { createClient } from "@/lib/supabase/client";

export default function AdminFinancesPage() {
  const [transactions, setTransactions] = useState<AdminTransaction[]>(mockAdminTransactions);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [selectedTx, setSelectedTx] = useState<AdminTransaction | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Charger dynamiquement les transactions depuis la base de données / API
  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/finances");
      if (response.ok) {
        const data = await response.json();
        if (data.transactions && data.transactions.length > 0) {
          setTransactions(data.transactions);
        }
      }
    } catch (error) {
      console.error("Erreur chargement transactions:", error);
    } finally {
      setLoading(false);
      setLastRefreshed(new Date());
    }
  };

  useEffect(() => {
    fetchTransactions();

    // Optionnel : écoute en temps réel Supabase si disponible
    try {
      const supabase = createClient();
      const channel = supabase
        .channel("admin-transactions-realtime")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "transactions" },
          () => {
            fetchTransactions();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch {
      // Ignorer si temps réel non configuré
    }
  }, []);

  // Calcul du Chiffre d'Affaires Total (somme des transactions 'paid' UNIQUEMENT)
  const paidTransactions = transactions.filter((t) => t.status === "paid");
  const totalRevenueFCFA = paidTransactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const paidCount = paidTransactions.length;
  const pendingCount = transactions.filter((t) => t.status === "pending").length;
  const failedCount = transactions.filter((t) => t.status === "failed").length;
  const totalCount = transactions.length;
  const successRatePct = totalCount > 0 ? ((paidCount / totalCount) * 100).toFixed(1) : "0.0";

  // Filtrage des transactions
  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch =
      (tx.user_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tx.user_email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tx.id || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tx.provider_reference || "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || tx.status === statusFilter;
    const matchesPlan = planFilter === "all" || (tx.plan_id || "").toLowerCase().includes(planFilter.toLowerCase());

    return matchesSearch && matchesStatus && matchesPlan;
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatPlanName = (planId: string) => {
    if (planId === "pack_starter" || planId === "starter") return "Starter (1 000 pièces)";
    if (planId === "pack_creator" || planId === "creator") return "Creator (3 000 pièces)";
    if (planId === "pack_author" || planId === "author") return "Author (7 000 pièces)";
    if (planId === "pack_pro" || planId === "pro") return "Pro (16 000 pièces)";
    if (planId === "pack_studio" || planId === "studio") return "Studio (45 000 pièces)";
    return planId;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-emerald-400" />
            Finances & Transactions SebPay
          </h1>
          <p className="text-neutral-400 text-sm mt-1">
            Suivi en temps réel des encaissements Mobile Money & Cartes, journal des transactions et chiffre d'affaires.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchTransactions}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-semibold text-neutral-300 hover:text-white hover:bg-neutral-800 transition-all disabled:opacity-50"
            title="Rafraîchir les données depuis la base"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-emerald-400" : ""}`} />
            <span>Actualiser</span>
          </button>

          <Link
            href="/admin/subscriptions"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-orange-500/10 border border-orange-500/30 text-xs font-semibold text-orange-400 hover:bg-orange-500/20 transition-all"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Abonnements MRR</span>
          </Link>
        </div>
      </div>

      {/* Financial KPIs Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Revenue (Sum of 'paid' transactions only) */}
        <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-4 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <DollarSign className="w-16 h-16 text-emerald-400" />
          </div>
          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            Chiffre d'Affaires Total
          </span>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1 tracking-tight">
            {totalRevenueFCFA.toLocaleString("fr-FR")} <span className="text-xs text-neutral-400">FCFA</span>
          </div>
          <div className="text-xs text-emerald-400/90 mt-1 flex items-center gap-1 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Transactions payées uniquement ({paidCount})
          </div>
        </div>

        {/* Metric 2: Paid Transactions Count */}
        <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-4">
          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            Paiements Réussis
          </span>
          <div className="text-2xl sm:text-3xl font-black text-white mt-1">
            {paidCount} <span className="text-xs text-neutral-500 font-normal">/ {totalCount}</span>
          </div>
          <div className="text-xs text-emerald-400 mt-1 flex items-center gap-1 font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            Taux de succès : {successRatePct}%
          </div>
        </div>

        {/* Metric 3: Pending Transactions */}
        <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-4">
          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            Paiements en Attente
          </span>
          <div className="text-2xl sm:text-3xl font-black text-amber-400 mt-1">
            {pendingCount}
          </div>
          <div className="text-xs text-neutral-500 mt-1 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-400/80" />
            Validation USSD Mobile Money en cours
          </div>
        </div>

        {/* Metric 4: Failed Transactions */}
        <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-4">
          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            Paiements Échoués
          </span>
          <div className="text-2xl sm:text-3xl font-black text-red-400 mt-1">
            {failedCount}
          </div>
          <div className="text-xs text-neutral-500 mt-1 flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5 text-red-400/80" />
            Annulations ou soldes insuffisants
          </div>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher par référence, email client, nom ou ID SebPay..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-neutral-900 px-3 py-2 rounded-xl border border-neutral-800">
            <span className="text-xs font-semibold text-neutral-400">Statut :</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs font-medium text-white focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-neutral-900">Tous les statuts</option>
              <option value="paid" className="bg-neutral-900">Payé (Paid)</option>
              <option value="pending" className="bg-neutral-900">En attente (Pending)</option>
              <option value="failed" className="bg-neutral-900">Échoué (Failed)</option>
            </select>
          </div>

          {/* Plan Filter */}
          <div className="flex items-center gap-1.5 bg-neutral-900 px-3 py-2 rounded-xl border border-neutral-800">
            <span className="text-xs font-semibold text-neutral-400">Pack :</span>
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="bg-transparent text-xs font-medium text-white focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-neutral-900">Tous les packs</option>
              <option value="starter" className="bg-neutral-900">Starter (1 000 F)</option>
              <option value="creator" className="bg-neutral-900">Creator (2 500 F)</option>
              <option value="author" className="bg-neutral-900">Author (5 000 F)</option>
              <option value="pro" className="bg-neutral-900">Pro (15 000 F)</option>
              <option value="studio" className="bg-neutral-900">Studio (45 000 F)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transactions Data Table */}
      <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-neutral-300">
            <thead className="bg-neutral-900/80 text-xs font-semibold uppercase text-neutral-400 tracking-wider border-b border-neutral-800">
              <tr>
                <th className="px-6 py-4">Date & Heure</th>
                <th className="px-4 py-4">Référence Iris</th>
                <th className="px-4 py-4">Auteur / Client</th>
                <th className="px-4 py-4">Pack & Pièces</th>
                <th className="px-4 py-4">Montant</th>
                <th className="px-4 py-4">Statut</th>
                <th className="px-4 py-4">Réf. SebPay</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900">
              {filteredTransactions.map((tx) => {
                const isPaid = tx.status === "paid";
                const isPending = tx.status === "pending";
                const isFailed = tx.status === "failed";

                return (
                  <tr
                    key={tx.id}
                    onClick={() => setSelectedTx(tx)}
                    className="hover:bg-neutral-900/50 transition-colors group cursor-pointer"
                  >
                    {/* Date */}
                    <td className="px-6 py-4 text-xs text-neutral-400 whitespace-nowrap">
                      {new Date(tx.created_at).toLocaleString("fr-FR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>

                    {/* ID / Ref */}
                    <td className="px-4 py-4 font-mono text-xs text-neutral-300" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        <span className="truncate max-w-[110px]" title={tx.id}>
                          {tx.id}
                        </span>
                        <button
                          onClick={() => copyToClipboard(tx.id)}
                          className="text-neutral-500 hover:text-white transition-colors"
                          title="Copier l'ID"
                        >
                          {copiedId === tx.id ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <span className="text-[10px] font-mono text-neutral-500 hover:text-neutral-300">📋</span>
                          )}
                        </button>
                      </div>
                    </td>

                    {/* User */}
                    <td className="px-4 py-4">
                      <div className="font-bold text-white group-hover:text-emerald-400 transition-colors">
                        {tx.user_name || "Auteur"}
                      </div>
                      <div className="text-xs text-neutral-500 font-mono truncate max-w-[180px]">
                        {tx.user_email || "N/A"}
                      </div>
                    </td>

                    {/* Plan */}
                    <td className="px-4 py-4">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold uppercase bg-neutral-900 border border-neutral-800 text-neutral-200">
                        {formatPlanName(tx.plan_id)}
                      </span>
                    </td>

                    {/* Amount */}
                    <td className="px-4 py-4 font-black text-white whitespace-nowrap">
                      {Number(tx.amount).toLocaleString("fr-FR")} {tx.currency || "XOF"}
                    </td>

                    {/* Status Pill */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                          isPaid
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-xs shadow-emerald-500/10"
                            : isPending
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse"
                            : "bg-red-500/10 text-red-400 border-red-500/20"
                        }`}
                      >
                        {isPaid && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                        {isPending && <Clock className="w-3.5 h-3.5 text-amber-400" />}
                        {isFailed && <XCircle className="w-3.5 h-3.5 text-red-400" />}
                        {tx.status}
                      </span>
                    </td>

                    {/* Provider Reference */}
                    <td className="px-4 py-4 font-mono text-xs text-neutral-400">
                      {tx.provider_reference ? (
                        <span className="text-neutral-300">{tx.provider_reference}</span>
                      ) : (
                        <span className="text-neutral-600">—</span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setSelectedTx(tx)}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white transition-colors"
                      >
                        Détails
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-neutral-500">
                    Aucune transaction trouvée pour ces critères de recherche.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Details Modal */}
      {selectedTx && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in"
          onClick={() => setSelectedTx(null)}
        >
          <div
            className="bg-neutral-950 border border-neutral-800 rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-neutral-800 pb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    selectedTx.status === "paid"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : selectedTx.status === "pending"
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-red-500/20 text-red-400"
                  }`}
                >
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Détails de la Transaction</h2>
                  <p className="text-xs font-mono text-neutral-400">{selectedTx.id}</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedTx(null)}
                className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Financial Overview Card */}
            <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Montant Transaction
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                    selectedTx.status === "paid"
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : selectedTx.status === "pending"
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      : "bg-red-500/20 text-red-400 border border-red-500/30"
                  }`}
                >
                  {selectedTx.status}
                </span>
              </div>
              <div className="text-3xl font-black text-white">
                {Number(selectedTx.amount).toLocaleString("fr-FR")} {selectedTx.currency || "XOF"}
              </div>
            </div>

            {/* Information Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-neutral-900/50 p-3 rounded-xl border border-neutral-800">
                <span className="text-neutral-500 block mb-1">Auteur / Bénéficiaire</span>
                <span className="font-bold text-white text-sm block">{selectedTx.user_name || "Auteur"}</span>
                <span className="text-neutral-400 font-mono">{selectedTx.user_email}</span>
              </div>

              <div className="bg-neutral-900/50 p-3 rounded-xl border border-neutral-800">
                <span className="text-neutral-500 block mb-1">Pack Débloqué</span>
                <span className="font-bold text-emerald-400 text-sm block">{formatPlanName(selectedTx.plan_id)}</span>
                <span className="text-neutral-400">Passerelle SebPay Mobile Money</span>
              </div>

              <div className="bg-neutral-900/50 p-3 rounded-xl border border-neutral-800">
                <span className="text-neutral-500 block mb-1">Réf. Fournisseur (SebPay)</span>
                <span className="font-mono text-neutral-300 font-semibold">
                  {selectedTx.provider_reference || "En attente"}
                </span>
              </div>

              <div className="bg-neutral-900/50 p-3 rounded-xl border border-neutral-800">
                <span className="text-neutral-500 block mb-1">Date d'Initiation</span>
                <span className="text-neutral-300 font-semibold">
                  {new Date(selectedTx.created_at).toLocaleString("fr-FR")}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-2 border-t border-neutral-800 flex justify-end">
              <button
                onClick={() => setSelectedTx(null)}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
