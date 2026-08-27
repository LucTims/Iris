"use client";

import { useState } from "react";
import useSWR from "swr";
import { 
  Bell, 
  Send, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Megaphone, 
  RefreshCw, 
  Sparkles, 
  Tag, 
  Link as LinkIcon, 
  Users,
  Info,
  ShieldAlert
} from "lucide-react";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "announcement" | "update" | "promo" | "warning";
  link?: string;
  target_user_id?: string;
  created_at: string;
}

export default function AdminNotificationsPage() {
  const { data, error, mutate, isLoading } = useSWR("/api/admin/notifications", fetcher);
  const notifications: Notification[] = data?.notifications || [];

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<"info" | "announcement" | "update" | "promo" | "warning">("announcement");
  const [link, setLink] = useState("");
  
  const [publishing, setPublishing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      setFeedback({ type: "error", msg: "Veuillez remplir le titre et le message." });
      return;
    }

    setPublishing(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          type,
          link: link.trim() || undefined,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Erreur lors de la publication.");

      setFeedback({ type: "success", msg: "Notification publiée avec succès à tous les utilisateurs !" });
      setTitle("");
      setMessage("");
      setLink("");
      mutate();
    } catch (err: any) {
      setFeedback({ type: "error", msg: err.message || "Impossible de publier la notification." });
    } finally {
      setPublishing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cette notification ?")) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/notifications?id=${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || "Erreur lors de la suppression.");
      }

      mutate();
    } catch (err: any) {
      alert("Erreur: " + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const getTypeBadge = (t: string) => {
    switch (t) {
      case "announcement":
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200"><Megaphone className="w-3.5 h-3.5" /> Annonce</span>;
      case "update":
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200"><RefreshCw className="w-3.5 h-3.5" /> Mise à jour</span>;
      case "promo":
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"><Tag className="w-3.5 h-3.5" /> Promotion</span>;
      case "warning":
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200"><ShieldAlert className="w-3.5 h-3.5" /> Alerte</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200"><Info className="w-3.5 h-3.5" /> Info</span>;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 max-w-6xl mx-auto pb-12">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-neutral-200 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-neutral-900 font-heading flex items-center gap-2.5">
            <Bell className="w-7 h-7 text-secondary" />
            <span>Gestion des Notifications</span>
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Diffusez des messages, annonces et offres en temps réel à l'ensemble des utilisateurs d'Iris.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-orange-50 text-secondary border border-orange-200 text-xs font-bold flex items-center gap-1.5">
            <Users className="w-4 h-4" />
            <span>Diffusion Broadcast</span>
          </span>
        </div>
      </div>

      {/* Main Grid: Publish Form + Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Form Card (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-neutral-200 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="border-b border-neutral-100 pb-4">
            <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
              <Send className="w-5 h-5 text-secondary" />
              <span>Rédiger une nouvelle notification</span>
            </h2>
            <p className="text-xs text-neutral-500 mt-1">
              Cette notification apparaîtra dans le menu cloche de tous les utilisateurs connectés.
            </p>
          </div>

          {feedback && (
            <div className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2.5 ${
              feedback.type === "success" 
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                : "bg-red-50 text-red-700 border border-red-200"
            }`}>
              {feedback.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{feedback.msg}</span>
            </div>
          )}

          <form onSubmit={handlePublish} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1.5 uppercase tracking-wider">
                Titre de la Notification *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Nouveauté : Génération complète de livre par IA !"
                className="w-full px-4 py-3 rounded-xl border border-neutral-200 text-sm font-medium focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-all"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1.5 uppercase tracking-wider">
                  Type de Message
                </label>
                <select
                  value={type}
                  onChange={(e: any) => setType(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 text-sm font-medium focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-all bg-white"
                >
                  <option value="announcement">📢 Annonce officielle</option>
                  <option value="update">🚀 Mise à jour / Nouveauté</option>
                  <option value="promo">🎁 Offre & Promotion</option>
                  <option value="info">ℹ️ Information générale</option>
                  <option value="warning">⚠️ Alerte / Maintenance</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1.5 uppercase tracking-wider">
                  Lien de redirection (Optionnel)
                </label>
                <input
                  type="text"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="Ex: /pricing ou /projects"
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 text-sm font-medium focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1.5 uppercase tracking-wider">
                Message / Contenu *
              </label>
              <textarea
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Rédigez ici le détail du message à transmettre à vos auteurs..."
                className="w-full px-4 py-3 rounded-xl border border-neutral-200 text-sm font-medium focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-all resize-y"
                required
              />
            </div>

            <button
              type="submit"
              disabled={publishing}
              className="w-full bg-secondary hover:bg-orange-600 text-white font-extrabold text-sm py-3.5 px-6 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer"
            >
              {publishing ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                  <span>Publication en cours...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Publier la notification à tous</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Live Preview Card (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-gradient-to-br from-neutral-900 to-neutral-800 text-white rounded-3xl p-6 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-700/60 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-orange-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" /> Aperçu Cloche Utilisateur
              </span>
              <span className="text-[10px] bg-neutral-700 px-2 py-0.5 rounded-full text-neutral-300">Rendu réel</span>
            </div>

            {/* Simulated Bell Popover item */}
            <div className="bg-white text-neutral-900 rounded-2xl p-4 shadow-lg border border-neutral-200 space-y-2">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center text-secondary shrink-0 mt-0.5">
                  <Bell className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h4 className="text-xs font-extrabold truncate text-neutral-900">
                      {title || "Titre de votre notification"}
                    </h4>
                    <span className="text-[10px] text-neutral-400 shrink-0">À l'instant</span>
                  </div>
                  <p className="text-xs text-neutral-600 line-clamp-3 leading-relaxed">
                    {message || "Le contenu de votre notification apparaîtra ici de manière claire et élégante."}
                  </p>
                  {link && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-secondary mt-2">
                      <span>Voir plus ({link})</span>
                    </span>
                  )}
                </div>
                <span className="w-2 h-2 rounded-full bg-secondary shrink-0 mt-1.5" />
              </div>
            </div>

            <p className="text-[11px] text-neutral-400 text-center italic">
              Tous les utilisateurs enregistrés verront ce message instantanément dans leur cloche.
            </p>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-3xl border border-neutral-200 shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-neutral-900">Historique des notifications publiées</h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Liste complète des messages envoyés via la plateforme ({notifications.length})
            </p>
          </div>
          <button 
            onClick={() => mutate()} 
            className="p-2 rounded-xl text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
            title="Rafraîchir"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-neutral-400 text-sm">Chargement des notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="py-12 text-center text-neutral-400 text-sm">
            Aucune notification n'a été envoyée pour le moment.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-100 text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Titre & Message</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Audience</th>
                  <th className="py-3 px-4">Date de publication</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-xs">
                {notifications.map((notif) => (
                  <tr key={notif.id} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="py-4 px-4 max-w-xs sm:max-w-md">
                      <p className="font-bold text-neutral-900">{notif.title}</p>
                      <p className="text-neutral-500 line-clamp-1 mt-0.5">{notif.message}</p>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      {getTypeBadge(notif.type)}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-neutral-600 font-semibold">
                        <Users className="w-3.5 h-3.5 text-neutral-400" />
                        Tous les utilisateurs
                      </span>
                    </td>
                    <td className="py-4 px-4 text-neutral-500 whitespace-nowrap">
                      {new Date(notif.created_at).toLocaleString("fr-FR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-4 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleDelete(notif.id)}
                        disabled={deletingId === notif.id}
                        className="p-2 rounded-xl text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
