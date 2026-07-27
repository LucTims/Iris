"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { useUser } from "@/hooks/useUser";
import { createClient } from "@/lib/supabase/client";

export default function SettingsPage() {
  const { user, profile, displayName, displayEmail } = useUser();
  const userInitials = displayName ? displayName.substring(0, 2).toUpperCase() : "AU";
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (profile?.full_name || displayName) {
      setFullName(profile?.full_name || displayName);
    }
  }, [profile, displayName]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setMessage("");

    try {
      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          full_name: fullName,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      setMessage("Profil mis à jour avec succès !");
    } catch (err: any) {
      setMessage("Erreur lors de la sauvegarde : " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] font-body text-neutral-900 flex flex-col md:flex-row">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-10">
        <header className="bg-white border-b border-neutral-200/80 sticky top-0 z-30 h-16 px-4 md:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-neutral-600 hover:text-neutral-900 bg-neutral-100 px-3 py-2 rounded-xl transition-all">
              <span className="material-symbols-outlined text-base">arrow_back</span>
              <span>Tableau de bord</span>
            </Link>
            <h1 className="font-heading font-extrabold text-xl text-neutral-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">settings</span>
              <span>Paramètres du Compte</span>
            </h1>
          </div>
        </header>

        <main className="p-4 sm:p-6 md:p-10 max-w-5xl mx-auto w-full space-y-8">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Settings Sidebar */}
            <aside className="w-full md:w-64 space-y-1">
              <button className="w-full flex items-center gap-3 px-4 py-3 bg-neutral-900 text-white rounded-xl font-bold text-xs">
                <span className="material-symbols-outlined text-lg">person</span>
                <span>Profil Auteur</span>
              </button>
              <Link href="/billing" className="w-full flex items-center gap-3 px-4 py-3 text-neutral-600 hover:bg-neutral-100 rounded-xl font-medium text-xs">
                <span className="material-symbols-outlined text-lg">credit_card</span>
                <span>Abonnement &amp; Facturation</span>
              </Link>
            </aside>

            {/* Settings Content */}
            <main className="flex-1 bg-white rounded-2xl border border-neutral-200/80 shadow-2xs overflow-hidden">
              <div className="p-6 sm:p-8 border-b border-neutral-100 space-y-6">
                <h2 className="font-heading text-lg font-bold text-neutral-900">Informations Personnelles</h2>
                
                {message && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-2.5 rounded-xl text-xs font-bold">
                    {message}
                  </div>
                )}

                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-full bg-orange-100 border border-orange-200 flex items-center justify-center text-secondary font-extrabold font-heading text-2xl">
                    {userInitials}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-neutral-700 block">Avatar Auteur</span>
                    <p className="text-[11px] text-neutral-400">Généré automatiquement par vos initiales.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-neutral-700 mb-1.5 uppercase">Nom complet / Nom de plume</label>
                    <input 
                      type="text" 
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-xs font-medium focus:border-secondary outline-none" 
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-neutral-700 mb-1.5 uppercase">Adresse E-mail</label>
                    <input 
                      type="email" 
                      value={displayEmail} 
                      disabled
                      className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-xs font-medium bg-neutral-50 text-neutral-500 outline-none" 
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-neutral-700 mb-1.5 uppercase">Biographie de l&apos;Auteur</label>
                    <textarea 
                      rows={3} 
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Rédigez une brève présentation pour vos lecteurs..."
                      className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-xs font-medium focus:border-secondary outline-none"
                    ></textarea>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-neutral-50 flex justify-end gap-3">
                <button 
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-secondary text-white px-6 py-2.5 rounded-xl font-bold text-xs hover:bg-orange-600 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  {saving ? "Enregistrement..." : "Enregistrer les modifications"}
                </button>
              </div>
            </main>
          </div>
        </main>
      </div>
    </div>
  );
}
