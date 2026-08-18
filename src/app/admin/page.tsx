"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Users,
  DollarSign,
  Cpu,
  BookOpen,
  Sparkles,
  TrendingUp,
  Activity,
  ArrowUpRight,
  ShieldCheck,
  HeartPulse,
  Terminal,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  CreditCard,
} from "lucide-react";
import {
  mockKPIData,
  mockActivity7d,
  mockActivity30d,
  mockActivity90d,
  mockActivityEvents,
} from "@/lib/admin/mockData";

export default function AdminDashboardPage() {
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("7d");
  const activityData =
    timeRange === "7d"
      ? mockActivity7d
      : timeRange === "30d"
      ? mockActivity30d
      : mockActivity90d;

  const maxGenerations = Math.max(...activityData.map((d) => d.ai_generations));

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Vue d'ensemble
          </h1>
          <p className="text-neutral-400 text-sm mt-1">
            Cockpit opérationnel, métriques clés et flux d'activité en temps réel.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 border border-neutral-700 text-xs font-medium text-neutral-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Temps réel synchronisé
          </span>
        </div>
      </div>

      {/* 6 Top KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* KPI 1: Utilisateurs */}
        <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-5 relative overflow-hidden group hover:border-neutral-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              Auteurs Inscrits
            </span>
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white">
              {mockKPIData.total_users.toLocaleString("fr-FR")}
            </div>
            <div className="flex items-center gap-1 mt-1 text-xs text-emerald-400 font-medium">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+{mockKPIData.users_growth_pct}% ce mois</span>
            </div>
          </div>
        </div>

        {/* KPI 2: MRR */}
        <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-5 relative overflow-hidden group hover:border-neutral-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              MRR Récurrent
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white">
              {(mockKPIData.mrr_fcfa / 1000).toFixed(0)}k <span className="text-xs font-normal text-neutral-400">FCFA</span>
            </div>
            <div className="flex items-center gap-1 mt-1 text-xs text-emerald-400 font-medium">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+{mockKPIData.mrr_growth_pct}% ce mois</span>
            </div>
          </div>
        </div>

        {/* KPI 3: Coûts IA */}
        <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-5 relative overflow-hidden group hover:border-neutral-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              Coûts IA
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white">
              ${mockKPIData.ai_cost_usd.toFixed(2)}
            </div>
            <div className="text-xs text-neutral-400 mt-1 truncate">
              {(mockKPIData.ai_tokens_total / 1000000).toFixed(1)}M tokens consommés
            </div>
          </div>
        </div>

        {/* KPI 4: Projets de Livres */}
        <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-5 relative overflow-hidden group hover:border-neutral-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              Livres Créés
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white">
              {mockKPIData.total_projects.toLocaleString("fr-FR")}
            </div>
            <div className="flex items-center gap-1 mt-1 text-xs text-emerald-400 font-medium">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+{mockKPIData.projects_growth_pct}% ce mois</span>
            </div>
          </div>
        </div>

        {/* KPI 5: Mots Générés */}
        <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-5 relative overflow-hidden group hover:border-neutral-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              Mots Générés
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white">
              {(mockKPIData.total_words_generated / 1000000).toFixed(2)}M
            </div>
            <div className="text-xs text-neutral-400 mt-1">
              Conv. Free/Pro : {mockKPIData.conversion_rate_pct}%
            </div>
          </div>
        </div>

        {/* KPI 6: SLA Uptime */}
        <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-5 relative overflow-hidden group hover:border-neutral-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              Disponibilité
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <HeartPulse className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white">
              {mockKPIData.system_uptime_pct}%
            </div>
            <div className="flex items-center gap-1 mt-1 text-xs text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>SLA Opérationnel</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Activity Timeline Chart & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Activity Timeline Chart (2 cols) */}
        <div className="lg:col-span-2 bg-neutral-950 border border-neutral-800/80 rounded-2xl p-6 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-orange-400" />
                Activité & Générations IA
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Volume des requêtes d'écriture assistée et mots produits
              </p>
            </div>
            <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-xl border border-neutral-800">
              <button
                onClick={() => setTimeRange("7d")}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  timeRange === "7d"
                    ? "bg-orange-500 text-white shadow-xs"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                7 jours
              </button>
              <button
                onClick={() => setTimeRange("30d")}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  timeRange === "30d"
                    ? "bg-orange-500 text-white shadow-xs"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                30 jours
              </button>
              <button
                onClick={() => setTimeRange("90d")}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  timeRange === "90d"
                    ? "bg-orange-500 text-white shadow-xs"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                90 jours
              </button>
            </div>
          </div>

          {/* Bar Chart Visualizer */}
          <div className="space-y-4">
            <div className="h-48 flex items-end gap-2 sm:gap-4 pt-8 px-2 border-b border-neutral-800">
              {activityData.map((d, i) => {
                const heightPct = Math.round((d.ai_generations / maxGenerations) * 100);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative">
                    {/* Tooltip */}
                    <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-neutral-900 border border-neutral-700 text-white text-[11px] py-1 px-2 rounded-md whitespace-nowrap shadow-xl z-20 pointer-events-none">
                      <span className="font-bold text-orange-400">{d.ai_generations}</span> générations • {(d.words_count / 1000).toFixed(0)}k mots
                    </div>
                    {/* Bar */}
                    <div className="w-full bg-neutral-900 hover:bg-neutral-800 rounded-t-lg h-full flex items-end transition-all">
                      <div
                        style={{ height: `${heightPct}%` }}
                        className="w-full bg-gradient-to-t from-orange-600 via-amber-500 to-orange-400 rounded-t-md group-hover:brightness-110 transition-all shadow-lg shadow-orange-500/10"
                      />
                    </div>
                    {/* Date label */}
                    <span className="text-[10px] text-neutral-400 font-medium truncate w-full text-center">
                      {d.date}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Chart Legend & Summary */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 text-xs text-neutral-400">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-orange-500" />
                  Appels IA Co-Auteur
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-amber-400" />
                  Mots manuscrits générés
                </span>
              </div>
              <span className="font-semibold text-neutral-300">
                Pic d'activité : {maxGenerations} requêtes / jour
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions Shortcuts (1 col) */}
        <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-white mb-1">Actions Rapides</h2>
            <p className="text-xs text-neutral-400 mb-6">
              Raccourcis vers les tâches d'exploitation fréquentes
            </p>

            <div className="space-y-3">
              <Link
                href="/admin/users"
                className="flex items-center justify-between p-3.5 rounded-xl bg-neutral-900/80 hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white group-hover:text-orange-400 transition-colors">
                      Gérer les Utilisateurs
                    </div>
                    <div className="text-xs text-neutral-400">Modifier forfaits, bannir ou auditer</div>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-neutral-500 group-hover:text-white transition-colors" />
              </Link>

              <Link
                href="/admin/ai"
                className="flex items-center justify-between p-3.5 rounded-xl bg-neutral-900/80 hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                    <Cpu className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                      Surveillance IA & Modèles
                    </div>
                    <div className="text-xs text-neutral-400">Tokens Gemini 2.5 Flash vs Pro</div>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-neutral-500 group-hover:text-white transition-colors" />
              </Link>

              <Link
                href="/admin/logs"
                className="flex items-center justify-between p-3.5 rounded-xl bg-neutral-900/80 hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                    <Terminal className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white group-hover:text-purple-400 transition-colors">
                      Logs & Événements
                    </div>
                    <div className="text-xs text-neutral-400">Inspecter les erreurs et traces JSON</div>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-neutral-500 group-hover:text-white transition-colors" />
              </Link>

              <Link
                href="/admin/health"
                className="flex items-center justify-between p-3.5 rounded-xl bg-neutral-900/80 hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <HeartPulse className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
                      Santé Système & Ping
                    </div>
                    <div className="text-xs text-neutral-400">PostgreSQL, Auth, SebPay, Gemini</div>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-neutral-500 group-hover:text-white transition-colors" />
              </Link>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-neutral-800 text-[11px] text-neutral-400 flex items-center justify-between">
            <span>Version Admin : v2.4-priority1</span>
            <span className="text-emerald-400 font-medium">Supabase Mock Store Actif</span>
          </div>
        </div>
      </div>

      {/* Live Activity Event Stream */}
      <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-400" />
              Flux d'Activité en Direct
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Événements récents survenus sur la plateforme Iris
            </p>
          </div>
          <span className="text-xs font-mono text-neutral-400">
            {mockActivityEvents.length} événements récents
          </span>
        </div>

        <div className="divide-y divide-neutral-900">
          {mockActivityEvents.map((evt) => (
            <div key={evt.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group">
              <div className="flex items-start sm:items-center gap-3.5">
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ${evt.badge_color || "bg-neutral-800 text-neutral-300"}`}>
                  {evt.type.toUpperCase()}
                </span>
                <div>
                  <div className="text-sm font-bold text-white group-hover:text-orange-400 transition-colors">
                    {evt.title}
                  </div>
                  <div className="text-xs text-neutral-400 mt-0.5">
                    {evt.description}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-neutral-500 shrink-0 sm:self-center">
                {evt.user_email && (
                  <span className="font-mono text-neutral-400 hidden md:inline">{evt.user_email}</span>
                )}
                <span>{evt.timestamp}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
