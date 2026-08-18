"use client";

import React, { useState } from "react";
import {
  Users,
  Search,
  Filter,
  Shield,
  ShieldAlert,
  CheckCircle,
  Clock,
  XCircle,
  MoreVertical,
  BookOpen,
  Sparkles,
  DollarSign,
  Mail,
  Calendar,
  X,
  PlusCircle,
  AlertTriangle,
} from "lucide-react";
import { mockAdminUsers, mockAdminProjects } from "@/lib/admin/mockData";
import { AdminUser, PlanType, SubscriptionStatus } from "@/lib/admin/types";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>(mockAdminUsers);
  const [searchQuery, setSearchQuery] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Filter logic
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlan = planFilter === "all" || user.plan === planFilter;
    const matchesStatus = statusFilter === "all" || user.subscription_status === statusFilter;
    return matchesSearch && matchesPlan && matchesStatus;
  });

  // Handle plan update
  const handlePlanChange = (userId: string, newPlan: PlanType) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, plan: newPlan } : u))
    );
    if (selectedUser && selectedUser.id === userId) {
      setSelectedUser({ ...selectedUser, plan: newPlan });
    }
    setFeedbackMessage(`Plan de l'utilisateur mis à jour vers : ${newPlan.toUpperCase()}`);
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  // Handle Ban / Unban toggle
  const handleToggleBan = (userId: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const isBanned = u.subscription_status === "banned";
          const newStatus: SubscriptionStatus = isBanned ? "active" : "banned";
          const updated = {
            ...u,
            subscription_status: newStatus,
            banned_reason: isBanned ? undefined : "Suspension administrative manuelle",
          };
          if (selectedUser && selectedUser.id === userId) {
            setSelectedUser(updated);
          }
          return updated;
        }
        return u;
      })
    );
    setFeedbackMessage("Statut du compte mis à jour avec succès.");
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  // Get authored projects for modal
  const userProjects = selectedUser
    ? mockAdminProjects.filter((p) => p.author_id === selectedUser.id || p.author_email === selectedUser.email)
    : [];

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {feedbackMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-neutral-900 border border-emerald-500/50 text-emerald-300 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-sm font-medium animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <Users className="w-8 h-8 text-orange-400" />
            Gestion des Utilisateurs
          </h1>
          <p className="text-neutral-400 text-sm mt-1">
            Contrôle des profils auteurs, forfaits d'abonnement et autorisations d'accès.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-lg bg-neutral-800 border border-neutral-700 text-xs font-semibold text-neutral-300">
            {filteredUsers.length} auteur{filteredUsers.length > 1 ? "s" : ""} affiché{filteredUsers.length > 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher par nom, prénom ou email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-orange-500 transition-colors"
          />
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Plan Filter */}
          <div className="flex items-center gap-1.5 bg-neutral-900 px-3 py-2 rounded-xl border border-neutral-800">
            <span className="text-xs font-semibold text-neutral-400">Plan :</span>
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="bg-transparent text-xs font-medium text-white focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-neutral-900">Tous les plans</option>
              <option value="free" className="bg-neutral-900">Free</option>
              <option value="pro" className="bg-neutral-900">Pro</option>
              <option value="studio" className="bg-neutral-900">Studio</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-neutral-900 px-3 py-2 rounded-xl border border-neutral-800">
            <span className="text-xs font-semibold text-neutral-400">Statut :</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs font-medium text-white focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-neutral-900">Tous les statuts</option>
              <option value="active" className="bg-neutral-900">Actif</option>
              <option value="trialing" className="bg-neutral-900">En Essai</option>
              <option value="past_due" className="bg-neutral-900">Paiement en retard</option>
              <option value="banned" className="bg-neutral-900">Banni / Suspendu</option>
              <option value="canceled" className="bg-neutral-900">Résilié</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Data Table */}
      <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-neutral-300">
            <thead className="bg-neutral-900/80 text-xs font-semibold uppercase text-neutral-400 tracking-wider border-b border-neutral-800">
              <tr>
                <th className="px-6 py-4">Auteur / Email</th>
                <th className="px-4 py-4">Plan Actuel</th>
                <th className="px-4 py-4">Statut</th>
                <th className="px-4 py-4">Mots Générés</th>
                <th className="px-4 py-4">Livres</th>
                <th className="px-4 py-4">Dernière Activité</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900">
              {filteredUsers.map((user) => {
                const isBanned = user.subscription_status === "banned";
                return (
                  <tr
                    key={user.id}
                    className="hover:bg-neutral-900/50 transition-colors group cursor-pointer"
                    onClick={() => setSelectedUser(user)}
                  >
                    {/* User Identity */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={user.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"}
                          alt={user.full_name}
                          className="w-9 h-9 rounded-full object-cover ring-2 ring-neutral-800"
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-white group-hover:text-orange-400 transition-colors flex items-center gap-1.5">
                            {user.full_name}
                            {user.role === "admin" && (
                              <span className="px-1.5 py-0.2 text-[10px] font-bold rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
                                ADMIN
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-neutral-500 font-mono truncate">{user.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Plan Badge / Selector */}
                    <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={user.plan}
                        onChange={(e) => handlePlanChange(user.id, e.target.value as PlanType)}
                        className={`text-xs font-bold px-2.5 py-1 rounded-lg border focus:outline-none cursor-pointer ${
                          user.plan === "studio"
                            ? "bg-purple-500/10 text-purple-400 border-purple-500/30"
                            : user.plan === "pro"
                            ? "bg-orange-500/10 text-orange-400 border-orange-500/30"
                            : "bg-neutral-800 text-neutral-400 border-neutral-700"
                        }`}
                      >
                        <option value="free" className="bg-neutral-900 text-white">Free</option>
                        <option value="pro" className="bg-neutral-900 text-white">Pro</option>
                        <option value="studio" className="bg-neutral-900 text-white">Studio</option>
                      </select>
                    </td>

                    {/* Subscription Status Pill */}
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          user.subscription_status === "active"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : user.subscription_status === "trialing"
                            ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                            : user.subscription_status === "past_due"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : user.subscription_status === "banned"
                            ? "bg-red-500/10 text-red-400 border border-red-500/20"
                            : "bg-neutral-800 text-neutral-400"
                        }`}
                      >
                        {user.subscription_status === "active" && <CheckCircle className="w-3 h-3" />}
                        {user.subscription_status === "trialing" && <Clock className="w-3 h-3" />}
                        {user.subscription_status === "past_due" && <AlertTriangle className="w-3 h-3" />}
                        {user.subscription_status === "banned" && <XCircle className="w-3 h-3" />}
                        {user.subscription_status.toUpperCase()}
                      </span>
                    </td>

                    {/* Words Generated */}
                    <td className="px-4 py-4">
                      <div className="font-semibold text-white">
                        {user.words_generated.toLocaleString("fr-FR")}
                      </div>
                      <div className="text-[11px] text-neutral-500">
                        {(user.ai_tokens_used / 1000).toFixed(0)}k tokens
                      </div>
                    </td>

                    {/* Projects Count */}
                    <td className="px-4 py-4 font-semibold text-white">
                      {user.projects_count}
                    </td>

                    {/* Last Active */}
                    <td className="px-4 py-4 text-xs text-neutral-400">
                      {new Date(user.last_active).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedUser(user)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white transition-colors"
                        >
                          Détails
                        </button>
                        <button
                          onClick={() => handleToggleBan(user.id)}
                          title={isBanned ? "Débannir le compte" : "Suspendre/Bannir"}
                          className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors ${
                            isBanned
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                              : "bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20"
                          }`}
                        >
                          {isBanned ? "Débannir" : "Bannir"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-neutral-500">
                    Aucun utilisateur correspondant à votre recherche.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Author Profile Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div
            className="bg-neutral-950 border border-neutral-800 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <img
                  src={selectedUser.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"}
                  alt={selectedUser.full_name}
                  className="w-16 h-16 rounded-2xl object-cover ring-2 ring-orange-500/30 shadow-lg"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-white">{selectedUser.full_name}</h2>
                    <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 uppercase">
                      {selectedUser.plan}
                    </span>
                  </div>
                  <div className="text-xs text-neutral-400 font-mono mt-0.5 flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5" />
                    {selectedUser.email}
                  </div>
                  <div className="text-xs text-neutral-500 mt-1 flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5" />
                    Inscrit le {new Date(selectedUser.created_at).toLocaleDateString("fr-FR")}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                aria-label="Fermer la fenêtre"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Subscription & Billing Card */}
            <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                Abonnement & Facturation
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-neutral-500 block">Statut Actuel</span>
                  <span className="font-bold text-white uppercase">{selectedUser.subscription_status}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Fournisseur</span>
                  <span className="font-bold text-white uppercase">{selectedUser.payment_provider || "N/A"}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Renouvellement</span>
                  <span className="font-bold text-white">{selectedUser.renewal_date || "Sans engagement"}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Rôle Plateforme</span>
                  <span className="font-bold text-white uppercase">{selectedUser.role}</span>
                </div>
              </div>
              {selectedUser.banned_reason && (
                <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span><strong>Motif de suspension :</strong> {selectedUser.banned_reason}</span>
                </div>
              )}
            </div>

            {/* AI Usage Meters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-3">
                <span className="text-[11px] text-neutral-400 block font-medium">Mots Co-Auteur IA</span>
                <span className="text-lg font-black text-white">{selectedUser.words_generated.toLocaleString("fr-FR")}</span>
              </div>
              <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-3">
                <span className="text-[11px] text-neutral-400 block font-medium">Tokens Consommés</span>
                <span className="text-lg font-black text-white">{selectedUser.ai_tokens_used.toLocaleString("fr-FR")}</span>
              </div>
              <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-3">
                <span className="text-[11px] text-neutral-400 block font-medium">Projets Initiés</span>
                <span className="text-lg font-black text-white">{selectedUser.projects_count}</span>
              </div>
            </div>

            {/* Authored Books List */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3">
                Livres & Manuscrits de l'Auteur ({userProjects.length})
              </h3>
              {userProjects.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {userProjects.map((proj) => (
                    <div
                      key={proj.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-neutral-900 border border-neutral-800/80"
                    >
                      <div className="flex items-center gap-3">
                        <BookOpen className="w-4 h-4 text-orange-400 shrink-0" />
                        <div>
                          <div className="text-xs font-bold text-white">{proj.title}</div>
                          <div className="text-[11px] text-neutral-500">{proj.genre} • {proj.word_count.toLocaleString("fr-FR")} mots • {proj.chapters_count} chapitres</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">
                        {proj.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-neutral-500 rounded-xl bg-neutral-900/50 border border-neutral-800">
                  Aucun manuscrit publié ou en cours pour cet auteur.
                </div>
              )}
            </div>

            {/* Modal Administrative Action Buttons */}
            <div className="pt-4 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-neutral-400">Modifier plan :</span>
                <button
                  onClick={() => handlePlanChange(selectedUser.id, "free")}
                  className={`px-2.5 py-1 rounded text-xs font-bold ${selectedUser.plan === "free" ? "bg-neutral-700 text-white" : "bg-neutral-900 text-neutral-400 hover:text-white"}`}
                >
                  Free
                </button>
                <button
                  onClick={() => handlePlanChange(selectedUser.id, "pro")}
                  className={`px-2.5 py-1 rounded text-xs font-bold ${selectedUser.plan === "pro" ? "bg-orange-500 text-white" : "bg-neutral-900 text-neutral-400 hover:text-white"}`}
                >
                  Pro
                </button>
                <button
                  onClick={() => handlePlanChange(selectedUser.id, "studio")}
                  className={`px-2.5 py-1 rounded text-xs font-bold ${selectedUser.plan === "studio" ? "bg-purple-600 text-white" : "bg-neutral-900 text-neutral-400 hover:text-white"}`}
                >
                  Studio
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleBan(selectedUser.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors ${
                    selectedUser.subscription_status === "banned"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                      : "bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20"
                  }`}
                >
                  {selectedUser.subscription_status === "banned" ? "Débloquer l'accès" : "Suspendre l'accès"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
