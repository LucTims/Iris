"use client";

import React, { useState } from "react";
import {
  Settings,
  AlertTriangle,
  Sliders,
  Shield,
  Bot,
  Save,
  CheckCircle2,
  Mail,
  Plus,
  Trash2,
} from "lucide-react";
import { mockAdminSettings } from "@/lib/admin/mockData";
import { AdminSettingsState } from "@/lib/admin/types";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AdminSettingsState>(mockAdminSettings);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setToastMessage("Paramètres globaux enregistrés avec succès !");
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleAddEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail.trim() || !newAdminEmail.includes("@")) return;
    if (settings.admin_whitelist.includes(newAdminEmail.trim())) return;

    setSettings({
      ...settings,
      admin_whitelist: [...settings.admin_whitelist, newAdminEmail.trim()],
    });
    setNewAdminEmail("");
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    setSettings({
      ...settings,
      admin_whitelist: settings.admin_whitelist.filter((e) => e !== emailToRemove),
    });
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
            <Settings className="w-8 h-8 text-orange-400" />
            Paramètres Globaux & Feature Flags
          </h1>
          <p className="text-neutral-400 text-sm mt-1">
            Bandeau de maintenance, activation de fonctionnalités expérimentales et seuils de sécurité IA.
          </p>
        </div>
        <button
          onClick={handleSave}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-sm hover:from-orange-600 hover:to-amber-600 transition-all shadow-lg shadow-orange-500/20 flex items-center gap-2 self-start sm:self-auto"
        >
          <Save className="w-4 h-4" />
          Enregistrer les modifications
        </button>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Maintenance Banner */}
        <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-bold text-white">Bandeau de Maintenance</h2>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.maintenance_banner.enabled}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    maintenance_banner: {
                      ...settings.maintenance_banner,
                      enabled: e.target.checked,
                    },
                  })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
            </label>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-neutral-300 font-semibold mb-1">Message du bandeau</label>
              <input
                type="text"
                value={settings.maintenance_banner.message}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    maintenance_banner: {
                      ...settings.maintenance_banner,
                      message: e.target.value,
                    },
                  })
                }
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-neutral-300 font-semibold mb-1">Type de notification</label>
                <select
                  value={settings.maintenance_banner.type}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      maintenance_banner: {
                        ...settings.maintenance_banner,
                        type: e.target.value as "info" | "warning" | "danger",
                      },
                    })
                  }
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
                >
                  <option value="info">Info (Bleu)</option>
                  <option value="warning">Avertissement (Orange)</option>
                  <option value="danger">Urgence (Rouge)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="dismissible"
                  checked={settings.maintenance_banner.dismissible}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      maintenance_banner: {
                        ...settings.maintenance_banner,
                        dismissible: e.target.checked,
                      },
                    })
                  }
                  className="rounded bg-neutral-900 border-neutral-800 text-orange-500 focus:ring-0"
                />
                <label htmlFor="dismissible" className="text-neutral-300 font-medium">
                  Fermable par l'utilisateur
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Flags */}
        <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-purple-400" />
            <h2 className="text-base font-bold text-white">Feature Flags (Boutons d'Activation)</h2>
          </div>

          <div className="space-y-3">
            {[
              { id: "tiptap_v3_editor", label: "Éditeur Pagé TipTap v3 Pro", desc: "Support multi-pages et pagination continue" },
              { id: "imagen_3_covers", label: "Génération de Couvertures Imagen 3", desc: "Création HD de jaquettes 3D photoréalistes" },
              { id: "kdp_high_res_export", label: "Export Amazon KDP Haute Définition", desc: "PDF CMJN 300 DPI pour impression brochée" },
              { id: "sebpay_wave_momo", label: "Passerelle SebPay (Wave & MTN MoMo)", desc: "Paiement direct en monnaie locale FCFA" },
              { id: "strict_rate_limiting", label: "Limitation stricte des débits API", desc: "Protection anti-abus sur les endpoints IA" },
            ].map((flag) => {
              const isChecked = settings.feature_flags[flag.id as keyof typeof settings.feature_flags];
              return (
                <div
                  key={flag.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-neutral-900/60 border border-neutral-900"
                >
                  <div>
                    <div className="text-xs font-bold text-white">{flag.label}</div>
                    <div className="text-[11px] text-neutral-500">{flag.desc}</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer ml-4">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          feature_flags: {
                            ...settings.feature_flags,
                            [flag.id]: e.target.checked,
                          },
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Safety Limits */}
        <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-blue-400" />
            <h2 className="text-base font-bold text-white">Sécurité & Seuils de Dépenses IA</h2>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-neutral-300 font-semibold mb-1">Modèle par défaut en cas de repli</label>
              <select
                value={settings.ai_safety.default_fallback_model}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    ai_safety: { ...settings.ai_safety, default_fallback_model: e.target.value },
                  })
                }
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none cursor-pointer"
              >
                <option value="gemini-2.5-flash">Gemini 2.5 Flash (Ultra-rapide, économique)</option>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro (Qualité maximale, co-auteur)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-neutral-300 font-semibold mb-1">Plafond Dépense / Jour (USD)</label>
                <input
                  type="number"
                  value={settings.ai_safety.daily_spend_cap_usd}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      ai_safety: { ...settings.ai_safety, daily_spend_cap_usd: Number(e.target.value) },
                    })
                  }
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-neutral-300 font-semibold mb-1">Quota Gratuit / Jour (mots)</label>
                <input
                  type="number"
                  value={settings.ai_safety.user_daily_quota_free}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      ai_safety: { ...settings.ai_safety, user_daily_quota_free: Number(e.target.value) },
                    })
                  }
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Admin Email Whitelist */}
        <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-6 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Mail className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base font-bold text-white">Liste Blanche des Administrateurs</h2>
            </div>
            <p className="text-xs text-neutral-400 mb-4">Emails autorisés à accéder au cockpit sans restriction</p>

            <div className="flex gap-2 mb-4">
              <input
                type="email"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                placeholder="nouvel.admin@iris.app"
                className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={handleAddEmail}
                className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Ajouter
              </button>
            </div>

            <div className="space-y-2 max-h-40 overflow-y-auto">
              {settings.admin_whitelist.map((email) => (
                <div
                  key={email}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-900/60 border border-neutral-800 text-xs"
                >
                  <span className="font-mono text-neutral-300">{email}</span>
                  {settings.admin_whitelist.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveEmail(email)}
                      className="text-neutral-500 hover:text-red-400 transition-colors"
                      title="Retirer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
