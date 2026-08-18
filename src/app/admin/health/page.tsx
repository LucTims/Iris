"use client";

import React, { useState } from "react";
import {
  HeartPulse,
  Database,
  KeyRound,
  Cpu,
  CreditCard,
  Zap,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Clock,
  Server,
  Activity,
} from "lucide-react";
import { mockHealthItems } from "@/lib/admin/mockData";
import { ServiceHealthItem } from "@/lib/admin/types";

export default function AdminHealthPage() {
  const [services, setServices] = useState<ServiceHealthItem[]>(mockHealthItems);
  const [isPinging, setIsPinging] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handlePingAll = () => {
    setIsPinging(true);
    setTimeout(() => {
      // Simulate real-time latency ping updates
      setServices((prev) =>
        prev.map((s) => ({
          ...s,
          latency_ms: Math.floor(s.latency_ms * (0.85 + Math.random() * 0.3)),
          last_checked: "À l'instant",
        }))
      );
      setIsPinging(false);
      setToastMessage("Sonde de disponibilité exécutée : Tous les 5 services répondent avec succès !");
      setTimeout(() => setToastMessage(null), 3500);
    }, 800);
  };

  const getServiceIcon = (category: string) => {
    switch (category) {
      case "database":
        return Database;
      case "auth":
        return KeyRound;
      case "ai":
        return Cpu;
      case "payment":
        return CreditCard;
      default:
        return Server;
    }
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
            <HeartPulse className="w-8 h-8 text-emerald-400" />
            Santé Système & Surveillance Infrastructure
          </h1>
          <p className="text-neutral-400 text-sm mt-1">
            Statut en direct des bases PostgreSQL, de l'IA Gemini, de la passerelle SebPay et du CDN.
          </p>
        </div>
        <button
          onClick={handlePingAll}
          disabled={isPinging}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-sm hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 self-start sm:self-auto disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${isPinging ? "animate-spin" : ""}`} />
          {isPinging ? "Vérification en cours..." : "Tester tous les services"}
        </button>
      </div>

      {/* Global Status Banner */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-neutral-950 to-neutral-950 border border-emerald-500/30 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Tous les services sont 100% opérationnels
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Aucun incident critique détecté au cours des 30 derniers jours. SLA global à 99.98%.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6 text-xs text-neutral-400 pl-4 border-l border-neutral-800 hidden sm:flex">
          <div>
            <span className="block text-neutral-500 uppercase font-semibold text-[10px]">Uptime Global</span>
            <span className="text-base font-black text-emerald-400">99.98%</span>
          </div>
          <div>
            <span className="block text-neutral-500 uppercase font-semibold text-[10px]">Latence Moyenne</span>
            <span className="text-base font-black text-white">128 ms</span>
          </div>
        </div>
      </div>

      {/* 5 Services Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((service) => {
          const Icon = getServiceIcon(service.category);
          return (
            <div
              key={service.id}
              className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-5 space-y-4 hover:border-neutral-700 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-orange-400">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {service.status}
                  </span>
                </div>

                <h3 className="font-heading text-base font-bold text-white mt-3">
                  {service.name}
                </h3>
                <p className="text-xs text-neutral-400 mt-1 line-clamp-2">
                  {service.details}
                </p>
              </div>

              <div className="pt-3 border-t border-neutral-900 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-lg bg-neutral-900/60 border border-neutral-900">
                    <span className="text-neutral-500 block text-[10px] uppercase">Latence</span>
                    <span className="font-bold text-white flex items-center gap-1">
                      <Activity className="w-3 h-3 text-emerald-400" />
                      {service.latency_ms} ms
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-neutral-900/60 border border-neutral-900">
                    <span className="text-neutral-500 block text-[10px] uppercase">Disponibilité</span>
                    <span className="font-bold text-emerald-400">{service.uptime_pct}%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-1">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Vérifié : {service.last_checked}
                  </span>
                  <span className="uppercase font-mono font-bold text-[10px] text-neutral-400">
                    {service.category}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
