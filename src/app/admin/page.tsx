"use client";

import { useEffect, useState } from "react";
import { COINS_PER_USD } from "@/lib/ai/pricing";
import { getPackById } from "@/lib/coinPacks";

/* eslint-disable @typescript-eslint/no-explicit-any */

const fmt = (n: number) => (Number(n) || 0).toLocaleString("fr-FR");
const fmtFcfa = (n: number) => `${fmt(Math.round(Number(n) || 0))} F`;
const fmtUsd = (n: number) => `$${(Number(n) || 0).toFixed(2)}`;

function Tile({
  icon,
  label,
  value,
  sub,
  accent = "text-neutral-900",
}: {
  icon: string;
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-neutral-200/80 p-4 sm:p-5 shadow-2xs">
      <div className="flex items-center gap-2 text-neutral-400 mb-2">
        <span className="material-symbols-outlined text-lg">{icon}</span>
        <span className="text-[11px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <div className={`font-heading text-2xl sm:text-3xl font-extrabold ${accent}`}>{value}</div>
      {sub && <div className="text-xs text-neutral-500 mt-1">{sub}</div>}
    </div>
  );
}

function BarRow({ label, value, max, suffix }: { label: string; value: number; max: number; suffix?: string }) {
  const pct = max > 0 ? Math.max(3, Math.round((value / max) * 100)) : 0;
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="w-40 shrink-0 truncate text-neutral-600 font-medium">{label}</span>
      <div className="flex-1 h-2.5 rounded-full bg-neutral-100 overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-secondary to-amber-400" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-16 shrink-0 text-right font-bold text-neutral-800">
        {fmt(value)}
        {suffix || ""}
      </span>
    </div>
  );
}

const ACTION_LABELS: Record<string, string> = {
  generate_plan: "Sommaire / plan",
  generate_chapter: "Génération chapitre",
  generate_chapter_started: "Génération chapitre",
  generate_outline: "Structure (auto)",
  rewrite_chapter: "Réécriture",
  chat_assistant: "Chat (conversation)",
  chat_modify_chapter: "Chat (modif chapitre)",
  analyze_document: "Analyse de document",
  geo_score: "Score GEO",
  action_reformuler: "Bulle — reformuler",
  action_enrichir: "Bulle — enrichir",
  action_etendre: "Bulle — étendre",
  action_corriger: "Bulle — corriger",
  action_custom: "Bulle — instruction",
};

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/overview");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erreur de chargement.");
      setStats(data.stats);
    } catch (e: any) {
      setError(e?.message || "Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <span className="material-symbols-outlined animate-spin text-4xl text-secondary">progress_activity</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-16 bg-white border border-red-200 rounded-2xl p-6 text-center">
        <span className="material-symbols-outlined text-red-500 text-4xl">error</span>
        <p className="mt-2 font-bold text-neutral-800">{error}</p>
        <button onClick={load} className="mt-4 bg-secondary text-white px-4 py-2 rounded-xl text-sm font-bold">
          Réessayer
        </button>
      </div>
    );
  }

  const s = stats || {};
  const coinsSpent = Number(s.coins_spent) || 0;
  const apiCostUsd = Number(s.api_cost_usd) || 0;
  const billedUsd = coinsSpent / COINS_PER_USD;
  const margin = apiCostUsd > 0 ? billedUsd / apiCostUsd : null;

  const usageActions: [string, number][] = Object.entries(s.usage_by_action || {}) as any;
  usageActions.sort((a, b) => b[1] - a[1]);
  const maxAction = usageActions.reduce((m, [, v]) => Math.max(m, v), 0);

  const usageModels: [string, number][] = Object.entries(s.usage_by_model || {}) as any;
  usageModels.sort((a, b) => b[1] - a[1]);
  const maxModel = usageModels.reduce((m, [, v]) => Math.max(m, v), 0);

  const byPlan: [string, any][] = Object.entries(s.revenue_by_plan || {}) as any;
  const recent: any[] = s.recent_transactions || [];
  const top: any[] = s.top_spenders || [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-neutral-900">Vue d'ensemble</h1>
          <p className="text-sm text-neutral-500">Données en temps réel de la plateforme.</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 text-xs font-bold text-neutral-600 bg-white border border-neutral-200 px-3 py-2 rounded-xl hover:bg-neutral-50">
          <span className="material-symbols-outlined text-base">refresh</span>
          <span className="hidden sm:inline">Actualiser</span>
        </button>
      </div>

      {/* KPI principaux */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Tile icon="group" label="Utilisateurs" value={fmt(s.users_total)} sub={`+${fmt(s.new_users_7d)} sur 7 jours`} />
        <Tile icon="payments" label="Revenu total" value={fmtFcfa(s.revenue_fcfa)} sub={`+${fmtFcfa(s.revenue_7d_fcfa)} sur 7 jours`} accent="text-emerald-600" />
        <Tile icon="toll" label="Pièces en circulation" value={fmt(s.wallets_total_balance)} sub={`${fmt(s.coins_purchased)} achetées / offertes`} accent="text-amber-600" />
        <Tile icon="menu_book" label="Projets" value={fmt(s.projects_total)} sub={`${fmt(s.chapters_total)} chapitres · ${fmt(s.words_total)} mots`} />
      </div>

      {/* Économie / rentabilité */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-2xs">
        <h2 className="font-heading font-extrabold text-neutral-900 mb-1 flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary">savings</span> Économie & rentabilité
        </h2>
        <p className="text-xs text-neutral-500 mb-4">Coût réel des APIs converti en pièces, avec la marge appliquée.</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-neutral-50 rounded-xl p-3">
            <div className="text-[11px] font-bold uppercase text-neutral-400">Pièces dépensées</div>
            <div className="text-xl font-extrabold text-neutral-900">{fmt(coinsSpent)}</div>
          </div>
          <div className="bg-neutral-50 rounded-xl p-3">
            <div className="text-[11px] font-bold uppercase text-neutral-400">Coût API réel</div>
            <div className="text-xl font-extrabold text-neutral-900">{fmtUsd(apiCostUsd)}</div>
          </div>
          <div className="bg-neutral-50 rounded-xl p-3">
            <div className="text-[11px] font-bold uppercase text-neutral-400">Valeur facturée</div>
            <div className="text-xl font-extrabold text-neutral-900">{fmtUsd(billedUsd)}</div>
          </div>
          <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
            <div className="text-[11px] font-bold uppercase text-emerald-600">Marge réelle</div>
            <div className="text-xl font-extrabold text-emerald-700">{margin != null ? `x${margin.toFixed(1)}` : "—"}</div>
          </div>
        </div>
        <p className="text-[11px] text-neutral-400 mt-3">
          Taux de conversion configuré : 1 $ de coût API = {fmt(COINS_PER_USD)} pièces facturées (cible ~x4,5).
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Consommation par fonctionnalité */}
        <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-2xs">
          <h2 className="font-heading font-bold text-neutral-900 mb-4">Consommation par fonctionnalité</h2>
          <div className="space-y-2.5">
            {usageActions.length === 0 && <p className="text-xs text-neutral-400">Aucune utilisation pour le moment.</p>}
            {usageActions.slice(0, 12).map(([action, count]) => (
              <BarRow key={action} label={ACTION_LABELS[action] || action} value={count} max={maxAction} />
            ))}
          </div>
        </div>

        {/* Revenu par pack + modèles */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-2xs">
            <h2 className="font-heading font-bold text-neutral-900 mb-4">Revenu par pack</h2>
            <div className="space-y-2.5">
              {byPlan.length === 0 && <p className="text-xs text-neutral-400">Aucun achat pour le moment.</p>}
              {byPlan
                .sort((a, b) => (b[1]?.fcfa || 0) - (a[1]?.fcfa || 0))
                .map(([plan, obj]) => (
                  <div key={plan} className="flex items-center justify-between text-xs">
                    <span className="font-medium text-neutral-700">{getPackById(plan)?.name || plan}</span>
                    <span className="text-neutral-500">
                      <strong className="text-neutral-900">{fmtFcfa(obj?.fcfa)}</strong> · {fmt(obj?.count)} ventes
                    </span>
                  </div>
                ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-2xs">
            <h2 className="font-heading font-bold text-neutral-900 mb-4">Utilisation par modèle</h2>
            <div className="space-y-2.5">
              {usageModels.length === 0 && <p className="text-xs text-neutral-400">—</p>}
              {usageModels.map(([model, count]) => (
                <BarRow key={model} label={model} value={count} max={maxModel} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Top dépensiers */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-2xs">
        <h2 className="font-heading font-bold text-neutral-900 mb-4">Top utilisateurs (pièces dépensées)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-neutral-400 text-left border-b border-neutral-100">
                <th className="py-2 font-bold">Utilisateur</th>
                <th className="py-2 font-bold text-right">Pièces dépensées</th>
                <th className="py-2 font-bold text-right">Solde restant</th>
              </tr>
            </thead>
            <tbody>
              {top.length === 0 && (
                <tr><td colSpan={3} className="py-4 text-neutral-400 text-center">Aucune dépense enregistrée.</td></tr>
              )}
              {top.map((u, i) => (
                <tr key={i} className="border-b border-neutral-50">
                  <td className="py-2.5">
                    <div className="font-bold text-neutral-800">{u.name || "Auteur"}</div>
                    <div className="text-neutral-400">{u.email || "—"}</div>
                  </td>
                  <td className="py-2.5 text-right font-bold text-neutral-900">{fmt(u.spent)}</td>
                  <td className="py-2.5 text-right text-neutral-600">{fmt(u.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transactions récentes */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading font-bold text-neutral-900">Transactions récentes</h2>
          <span className="text-[11px] text-neutral-400">
            {fmt(s.tx_paid)} payées · {fmt(s.tx_pending)} en attente · {fmt(s.tx_failed)} échouées
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-neutral-400 text-left border-b border-neutral-100">
                <th className="py-2 font-bold">Utilisateur</th>
                <th className="py-2 font-bold">Pack</th>
                <th className="py-2 font-bold text-right">Montant</th>
                <th className="py-2 font-bold text-center">Statut</th>
                <th className="py-2 font-bold text-right">Date</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 && (
                <tr><td colSpan={5} className="py-4 text-neutral-400 text-center">Aucune transaction.</td></tr>
              )}
              {recent.map((t) => (
                <tr key={t.id} className="border-b border-neutral-50">
                  <td className="py-2.5">
                    <div className="font-bold text-neutral-800">{t.name || "Auteur"}</div>
                    <div className="text-neutral-400">{t.email || "—"}</div>
                  </td>
                  <td className="py-2.5 text-neutral-600">{getPackById(t.plan_id)?.name || t.plan_id || "—"}</td>
                  <td className="py-2.5 text-right font-bold text-neutral-900">{fmtFcfa(t.amount)}</td>
                  <td className="py-2.5 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        t.status === "paid"
                          ? "bg-emerald-50 text-emerald-700"
                          : t.status === "failed"
                          ? "bg-red-50 text-red-600"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {t.status === "paid" ? "Payé" : t.status === "failed" ? "Échoué" : "En attente"}
                    </span>
                  </td>
                  <td className="py-2.5 text-right text-neutral-400">
                    {t.created_at ? new Date(t.created_at).toLocaleDateString("fr-FR") : "—"}
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
