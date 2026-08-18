"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  KeyRound,
  Globe,
  Smartphone,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
} from "lucide-react";
import { mockSecurityMetrics } from "@/lib/admin/mockData";

export default function AdminSecurityPage() {
  const [metrics] = useState(mockSecurityMetrics);
  const [blockedIPs, setBlockedIPs] = useState<string[]>([
    "185.220.101.5",
    "194.26.29.112",
    "45.154.255.89",
    "91.240.118.242",
    "178.62.204.15",
  ]);
  const [newIP, setNewIP] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleBlockIP = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIP.trim()) return;
    if (blockedIPs.includes(newIP.trim())) {
      setToastMessage("Cette IP est déjà bloquée.");
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }
    setBlockedIPs([newIP.trim(), ...blockedIPs]);
    setNewIP("");
    setToastMessage("Nouvelle adresse IP ajoutée à la liste noire.");
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleUnblockIP = (ip: string) => {
    setBlockedIPs(blockedIPs.filter((item) => item !== ip));
    setToastMessage(`Adresse ${ip} débloquée.`);
    setTimeout(() => setToastMessage(null), 3000);
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
            <ShieldCheck className="w-8 h-8 text-emerald-400" />
            Sécurité & Contrôle des Accès
          </h1>
          <p className="text-neutral-400 text-sm mt-1">
            Posture de sécurité, sessions actives, authentification 2FA et liste noire d'adresses IP.
          </p>
        </div>
      </div>

      {/* Scorecard & Top Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Score Global</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              OPTIMAL
            </span>
          </div>
          <div className="text-3xl font-black text-emerald-400 mt-2">{metrics.score}/100</div>
          <div className="text-xs text-neutral-500 mt-1">Conformité RGPD & Chiffrement SSL</div>
        </div>

        <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Adoption 2FA</span>
          <div className="text-3xl font-black text-white mt-2">{metrics.two_factor_adoption_pct}%</div>
          <div className="text-xs text-neutral-500 mt-1">Obligatoire pour les comptes administrateurs</div>
        </div>

        <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Sessions Actives</span>
          <div className="text-3xl font-black text-blue-400 mt-2">{metrics.active_sessions_count}</div>
          <div className="text-xs text-neutral-500 mt-1">Jetons JWT Supabase valides</div>
        </div>

        <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">IPs Bloquées</span>
          <div className="text-3xl font-black text-red-400 mt-2">{blockedIPs.length}</div>
          <div className="text-xs text-neutral-500 mt-1">{metrics.failed_login_attempts_24h} tentatives bloquées (24h)</div>
        </div>
      </div>

      {/* Main Grid: IP Blocklist & Active Sessions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Blocked IP Manager */}
        <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <Globe className="w-5 h-5 text-red-400" />
              Liste Noire des Adresses IP (WAF)
            </h2>
            <p className="text-xs text-neutral-400 mb-4">
              Blocage automatique au niveau Edge contre le brute-force et le scraping
            </p>

            <form onSubmit={handleBlockIP} className="flex gap-2 mb-4">
              <input
                type="text"
                value={newIP}
                onChange={(e) => setNewIP(e.target.value)}
                placeholder="Ajouter une IP suspecte (ex: 192.168.1.1)"
                className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-red-500 font-mono"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-colors flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Bloquer
              </button>
            </form>

            <div className="space-y-2 max-h-56 overflow-y-auto">
              {blockedIPs.map((ip) => (
                <div
                  key={ip}
                  className="flex items-center justify-between p-3 rounded-xl bg-neutral-900/60 border border-neutral-800 font-mono text-xs"
                >
                  <div className="flex items-center gap-2 text-neutral-200">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    <span>{ip}</span>
                  </div>
                  <button
                    onClick={() => handleUnblockIP(ip)}
                    className="p-1 text-neutral-500 hover:text-red-400 transition-colors"
                    title="Débloquer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Active Admin Sessions */}
        <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-emerald-400" />
              Sessions Administrateurs Actives
            </h2>
            <p className="text-xs text-neutral-400 mb-4">
              Appareils connectés avec élévation de privilèges
            </p>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-neutral-900/80 border border-neutral-800 flex items-start justify-between">
                <div>
                  <div className="font-bold text-white flex items-center gap-2">
                    <span>MacBook Pro • Chrome 128</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                      SESSION ACTUELLE
                    </span>
                  </div>
                  <div className="text-neutral-400 mt-1 font-mono">
                    IP : 154.124.72.10 (Dakar, SN) • Connexion il y a 2h
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-900/80 border border-neutral-800 flex items-start justify-between">
                <div>
                  <div className="font-bold text-white">Windows 11 • Edge 127</div>
                  <div className="text-neutral-400 mt-1 font-mono">
                    IP : 92.184.105.44 (Paris, FR) • Connexion il y a 4h
                  </div>
                </div>
                <button className="text-xs text-red-400 hover:underline">Révoquer</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
