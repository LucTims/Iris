"use client";

import React, { useState } from "react";
import {
  Cpu,
  Sparkles,
  Zap,
  DollarSign,
  Clock,
  AlertTriangle,
  ShieldAlert,
  Activity,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import { mockAIModelUsage, mockAdminUsers, mockKPIData } from "@/lib/admin/mockData";

export default function AdminAIPage() {
  const [models] = useState(mockAIModelUsage);
  const heavyUsers = [...mockAdminUsers].sort((a, b) => b.ai_tokens_used - a.ai_tokens_used).slice(0, 5);

  const totalCostUsd = models.reduce((acc, curr) => acc + curr.estimated_cost_usd, 0);
  const totalTokens = models.reduce((acc, curr) => acc + curr.total_tokens, 0);
  const totalRequests = models.reduce((acc, curr) => acc + curr.requests_count, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <Cpu className="w-8 h-8 text-blue-400" />
            Surveillance IA & Consommation Modèles
          </h1>
          <p className="text-neutral-400 text-sm mt-1">
            Métriques d'utilisation des API Google Gemini 2.5 Flash / Pro, latences et coûts d'inférence.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs font-semibold text-blue-400">
            Vertex AI & Google AI Studio
          </span>
        </div>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-4">
          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Coût Estimé Mensuel</span>
          <div className="text-2xl font-black text-white mt-1">${totalCostUsd.toFixed(2)}</div>
          <div className="text-xs text-neutral-500 mt-1">~{(totalCostUsd * 600).toLocaleString("fr-FR")} FCFA</div>
        </div>
        <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-4">
          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Total Tokens Traités</span>
          <div className="text-2xl font-black text-blue-400 mt-1">{(totalTokens / 1000000).toFixed(2)}M</div>
          <div className="text-xs text-neutral-500 mt-1">Prompt + Complétion</div>
        </div>
        <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-4">
          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Requêtes IA Exécutées</span>
          <div className="text-2xl font-black text-white mt-1">{totalRequests.toLocaleString("fr-FR")}</div>
          <div className="text-xs text-emerald-400 mt-1 flex items-center gap-1 font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            +22.4% vs mois précédent
          </div>
        </div>
        <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-4">
          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Taux d'Erreur Global</span>
          <div className="text-2xl font-black text-emerald-400 mt-1">0.11%</div>
          <div className="text-xs text-neutral-500 mt-1">SLA Haute Disponibilité</div>
        </div>
      </div>

      {/* Models Breakdown Cards */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4">Modèles Actifs & Performance</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {models.map((model) => (
            <div
              key={model.model_id}
              className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-5 space-y-4 hover:border-neutral-700 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-mono font-bold text-neutral-500">{model.provider}</span>
                    <h3 className="font-heading text-lg font-bold text-white mt-0.5">{model.model_name}</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {model.status}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-xs bg-neutral-900/60 p-3 rounded-xl border border-neutral-900">
                  <div>
                    <span className="text-neutral-500 block text-[10px] uppercase">Requêtes</span>
                    <span className="font-bold text-white">{model.requests_count.toLocaleString("fr-FR")}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block text-[10px] uppercase">Coût USD</span>
                    <span className="font-bold text-emerald-400">${model.estimated_cost_usd.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block text-[10px] uppercase">Latence Moyenne</span>
                    <span className="font-bold text-white flex items-center gap-1">
                      <Clock className="w-3 h-3 text-neutral-400" />
                      {model.average_latency_ms}ms
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block text-[10px] uppercase">Erreurs</span>
                    <span className="font-bold text-white">{model.error_rate_pct}%</span>
                  </div>
                </div>
              </div>

              {model.total_tokens > 0 && (
                <div className="pt-2 border-t border-neutral-900 text-[11px] text-neutral-400 flex items-center justify-between">
                  <span>Tokens : {(model.total_tokens / 1000000).toFixed(2)}M</span>
                  <span className="text-neutral-500">Prompt {(model.prompt_tokens / 1000000).toFixed(1)}M / Out {(model.completion_tokens / 1000000).toFixed(1)}M</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Heavy Consumers Table */}
      <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-1">Top 5 Utilisateurs IA les Plus Consommateurs</h2>
        <p className="text-xs text-neutral-400 mb-4">
          Auteurs générant le plus grand volume de requêtes et de tokens
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-neutral-300">
            <thead className="bg-neutral-900/80 text-xs font-semibold uppercase text-neutral-400 tracking-wider border-b border-neutral-800">
              <tr>
                <th className="px-4 py-3">Auteur</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Tokens Consommés</th>
                <th className="px-4 py-3">Mots Co-Auteur</th>
                <th className="px-4 py-3 text-right">Coût Estimé</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900">
              {heavyUsers.map((user, idx) => {
                const estCost = (user.ai_tokens_used / 1000000) * 12; // approximate USD
                return (
                  <tr key={user.id} className="hover:bg-neutral-900/50">
                    <td className="px-4 py-3 flex items-center gap-3">
                      <span className="w-5 text-xs font-mono font-bold text-neutral-500">#{idx + 1}</span>
                      <div>
                        <div className="font-bold text-white">{user.full_name}</div>
                        <div className="text-xs text-neutral-500 font-mono">{user.email}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-xs font-bold uppercase bg-neutral-800 text-neutral-300">
                        {user.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-blue-400">
                      {user.ai_tokens_used.toLocaleString("fr-FR")}
                    </td>
                    <td className="px-4 py-3 font-semibold text-white">
                      {user.words_generated.toLocaleString("fr-FR")} mots
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-emerald-400">
                      ${estCost.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
