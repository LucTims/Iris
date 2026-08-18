"use client";

import React, { useState } from "react";
import {
  Terminal,
  Search,
  Filter,
  AlertCircle,
  AlertTriangle,
  Info,
  Flame,
  CheckCircle2,
  X,
  Code2,
} from "lucide-react";
import { mockAdminLogs } from "@/lib/admin/mockData";
import { AdminLogEntry, LogLevel } from "@/lib/admin/types";

export default function AdminLogsPage() {
  const [logs] = useState<AdminLogEntry[]>(mockAdminLogs);
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("ALL");
  const [serviceFilter, setServiceFilter] = useState<string>("ALL");
  const [selectedLog, setSelectedLog] = useState<AdminLogEntry | null>(null);

  const services = Array.from(new Set(logs.map((l) => l.service)));

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.endpoint.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.user_email && log.user_email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      log.ip_address.includes(searchQuery);
    const matchesLevel = levelFilter === "ALL" || log.level === levelFilter;
    const matchesService = serviceFilter === "ALL" || log.service === serviceFilter;
    return matchesSearch && matchesLevel && matchesService;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <Terminal className="w-8 h-8 text-purple-400" />
            Logs & Événements Système
          </h1>
          <p className="text-neutral-400 text-sm mt-1">
            Télémétrie applicative, requêtes HTTP, avertissements et traces d'erreurs en direct.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filtrer les logs par message, endpoint, email utilisateur, IP..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Level Filter */}
          <div className="flex items-center gap-1.5 bg-neutral-900 px-3 py-2 rounded-xl border border-neutral-800">
            <span className="text-xs font-semibold text-neutral-400">Niveau :</span>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="bg-transparent text-xs font-medium text-white focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-neutral-900">Tous les niveaux</option>
              <option value="INFO" className="bg-neutral-900">INFO</option>
              <option value="WARN" className="bg-neutral-900">WARN</option>
              <option value="ERROR" className="bg-neutral-900">ERROR</option>
              <option value="CRITICAL" className="bg-neutral-900">CRITICAL</option>
            </select>
          </div>

          {/* Service Filter */}
          <div className="flex items-center gap-1.5 bg-neutral-900 px-3 py-2 rounded-xl border border-neutral-800">
            <span className="text-xs font-semibold text-neutral-400">Service :</span>
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="bg-transparent text-xs font-medium text-white focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-neutral-900">Tous les services</option>
              {services.map((s) => (
                <option key={s} value={s} className="bg-neutral-900">{s}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-neutral-300">
            <thead className="bg-neutral-900/80 text-xs font-semibold uppercase text-neutral-400 tracking-wider border-b border-neutral-800">
              <tr>
                <th className="px-4 py-3">Niveau</th>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Service</th>
                <th className="px-4 py-3">Endpoint & Statut</th>
                <th className="px-4 py-3">Message</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900 font-mono text-xs">
              {filteredLogs.map((log) => {
                const isError = log.level === "ERROR" || log.level === "CRITICAL";
                const isWarn = log.level === "WARN";
                return (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="hover:bg-neutral-900/60 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          log.level === "CRITICAL"
                            ? "bg-red-900/50 text-red-300 border border-red-700"
                            : log.level === "ERROR"
                            ? "bg-red-500/20 text-red-400 border border-red-500/30"
                            : log.level === "WARN"
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            : "bg-neutral-800 text-neutral-300"
                        }`}
                      >
                        {log.level}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-neutral-400">
                      {new Date(log.timestamp).toLocaleTimeString("fr-FR")}
                    </td>
                    <td className="px-4 py-3 text-purple-400 font-bold">{log.service}</td>
                    <td className="px-4 py-3">
                      <span className="text-white font-semibold">{log.endpoint}</span>
                      <span className={`ml-2 px-1.5 py-0.2 rounded text-[10px] ${
                        log.status_code >= 500 ? "bg-red-500/20 text-red-400" :
                        log.status_code >= 400 ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400"
                      }`}>
                        {log.status_code}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-sans text-neutral-300 truncate max-w-md">
                      {log.message}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLog(log);
                        }}
                        className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-white font-sans text-xs font-medium"
                      >
                        Inspecter
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-neutral-950 border border-neutral-800 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl relative">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded text-xs font-bold uppercase ${
                    selectedLog.level === "CRITICAL" ? "bg-red-900/50 text-red-300 border border-red-700" :
                    selectedLog.level === "ERROR" ? "bg-red-500/20 text-red-400 border border-red-500/30" :
                    selectedLog.level === "WARN" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-neutral-800 text-neutral-300"
                  }`}>
                    {selectedLog.level}
                  </span>
                  <h2 className="text-lg font-bold text-white font-mono">{selectedLog.service}</h2>
                </div>
                <p className="text-xs text-neutral-400 mt-1 font-mono">{selectedLog.timestamp}</p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Context meta */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-neutral-900/70 p-4 rounded-2xl border border-neutral-900 font-mono">
              <div>
                <span className="text-neutral-500 block">Endpoint</span>
                <span className="text-white font-bold">{selectedLog.endpoint}</span>
              </div>
              <div>
                <span className="text-neutral-500 block">Status Code</span>
                <span className="text-emerald-400 font-bold">{selectedLog.status_code}</span>
              </div>
              <div>
                <span className="text-neutral-500 block">Adresse IP</span>
                <span className="text-neutral-300">{selectedLog.ip_address}</span>
              </div>
              <div>
                <span className="text-neutral-500 block">Utilisateur</span>
                <span className="text-neutral-300 truncate block">{selectedLog.user_email || "Anonyme"}</span>
              </div>
            </div>

            {/* Message */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-1">Message</span>
              <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 text-sm text-neutral-200">
                {selectedLog.message}
              </div>
            </div>

            {/* Payload JSON */}
            {selectedLog.payload && (
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-1 flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5 text-purple-400" />
                  Payload JSON
                </span>
                <pre className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-emerald-400 font-mono overflow-x-auto">
                  {JSON.stringify(selectedLog.payload, null, 2)}
                </pre>
              </div>
            )}

            {/* Stack trace */}
            {selectedLog.stack_trace && (
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-red-400 block mb-1">
                  Trace d'Exécution (Stack Trace)
                </span>
                <pre className="p-3.5 rounded-xl bg-red-950/20 border border-red-900/40 text-xs text-red-300 font-mono overflow-x-auto whitespace-pre-wrap">
                  {selectedLog.stack_trace}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
