"use client";

import { useAdminStats } from "@/hooks/useAdmin";
import { Users, FileText, ArrowUpRight, Activity, Wallet, Loader2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminDashboard() {
  const { stats, isLoading } = useAdminStats();

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  const act = stats?.activity_14d || [];
  const metrics = [
    { label: "Utilisateurs Inscrits", value: stats?.users_count || 0, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Projets (Livres)", value: stats?.projects_count || 0, icon: FileText, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Revenus (FCFA)", value: (stats?.total_revenue || 0).toLocaleString("fr-FR"), icon: Wallet, color: "text-orange-600", bg: "bg-orange-50" },
    { label: "Appels IA", value: (stats?.total_ai_actions || 0).toLocaleString("fr-FR"), icon: Activity, color: "text-purple-600", bg: "bg-purple-50" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-neutral-900 font-heading">Vue d'ensemble</h1>
          <p className="text-sm text-neutral-500">Statistiques globales de votre plateforme Iris (Temps réel).</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-500">{m.label}</p>
              <h3 className="text-2xl font-extrabold text-neutral-900 mt-1">{m.value}</h3>
            </div>
            <div className={`p-3 rounded-xl ${m.bg}`}>
              <m.icon className={`w-5 h-5 ${m.color}`} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
          <h3 className="text-base font-bold text-neutral-900 mb-6">Revenus (14 derniers jours)</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={act}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                <XAxis dataKey="day" tickFormatter={(v) => new Date(v).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short'})} stroke="#a3a3a3" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#a3a3a3" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => v + " F"} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  labelFormatter={(v) => new Date(v).toLocaleDateString('fr-FR')}
                  formatter={(val: number) => [val + " FCFA", "Revenus"]}
                />
                <Line type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#f97316' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
          <h3 className="text-base font-bold text-neutral-900 mb-6">Nouvelles Inscriptions</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={act}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                <XAxis dataKey="day" tickFormatter={(v) => new Date(v).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short'})} stroke="#a3a3a3" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#a3a3a3" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  labelFormatter={(v) => new Date(v).toLocaleDateString('fr-FR')}
                  formatter={(val: number) => [val + " utilisateurs", "Inscriptions"]}
                />
                <Line type="monotone" dataKey="signups" stroke="#2563eb" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#2563eb' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}