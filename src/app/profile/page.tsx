"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import { useUser } from "@/hooks/useUser";
import {
  User,
  Globe,
  AtSign,
  ShoppingCart,
  Upload,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";

export default function ProfilePage() {
  const { user, profile, displayName, displayEmail } = useUser();
  const userInitials = displayName ? displayName.substring(0, 2).toUpperCase() : "AU";

  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [twitterUrl, setTwitterUrl] = useState("");
  const [amazonUrl, setAmazonUrl] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");

  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  // Le message portait la même couleur verte « succès » qu'il s'agisse d'une
  // réussite ou d'une erreur : un échec d'enregistrement passait pour un succès.
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile || displayName) {
      setFullName(profile?.full_name || displayName || "");
      setBio(profile?.bio || "");
      setWebsiteUrl(profile?.website_url || "");
      setTwitterUrl(profile?.twitter_url || "");
      setAmazonUrl(profile?.amazon_url || "");
      setAvatarUrl(profile?.avatar_url || "");
    }
  }, [profile, displayName]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setFeedback(null);

    try {
      // La route serveur écrit dans la table `profiles` (source de vérité),
      // valide les URL et borne les longueurs. La page écrivait auparavant
      // bio / liens dans les métadonnées Auth : les colonnes de `profiles`
      // restaient vides et rien d'autre dans le produit ne voyait ces valeurs.
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          bio,
          website_url: websiteUrl,
          twitter_url: twitterUrl,
          amazon_url: amazonUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Enregistrement impossible.");

      // On réaffiche les valeurs normalisées par le serveur (URL complétées
      // en https://, pseudo X nettoyé) plutôt que la saisie brute.
      if (data.profile) {
        setFullName(data.profile.full_name || "");
        setBio(data.profile.bio || "");
        setWebsiteUrl(data.profile.website_url || "");
        setTwitterUrl(data.profile.twitter_url || "");
        setAmazonUrl(data.profile.amazon_url || "");
      }

      setFeedback({ kind: "success", text: "Profil mis à jour avec succès !" });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err) {
      setFeedback({
        kind: "error",
        text: err instanceof Error ? err.message : "Une erreur est survenue.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarFile = async (file: File | null | undefined) => {
    if (!file) return;
    setUploadingAvatar(true);
    setFeedback(null);

    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/profile/avatar", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Envoi de l'avatar impossible.");

      setAvatarUrl(data.avatar_url);
      setFeedback({ kind: "success", text: "Avatar mis à jour." });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err) {
      setFeedback({
        kind: "error",
        text: err instanceof Error ? err.message : "Envoi de l'avatar impossible.",
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <AppLayout>
        <header className="bg-white dark:bg-neutral-900/80 dark:bg-neutral-950/80 backdrop-blur-md border-b border-neutral-100 dark:border-neutral-800 sticky top-0 z-20 h-16 px-4 md:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:text-neutral-100 dark:hover:text-white bg-neutral-100 dark:bg-neutral-800 px-3 py-2 rounded-xl transition-all">
              <span className="material-symbols-outlined text-base">arrow_back</span>
              <span>Tableau de bord</span>
            </Link>
            <h1 className="font-heading font-extrabold text-xl text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <User className="w-5 h-5 text-secondary" strokeWidth={2.5} />
              <span>Mon Profil</span>
            </h1>
          </div>
          <Link href="/settings" className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs font-bold px-4 py-2 rounded-xl transition-all">
            <span className="material-symbols-outlined text-base">settings</span>
            <span className="hidden sm:inline">Paramètres</span>
          </Link>
        </header>

        <main className="p-4 sm:p-6 md:p-10 max-w-5xl mx-auto w-full space-y-8">
          <div className="flex flex-col gap-8">


            {/* Settings Content */}
            <div className="flex-1 space-y-6">
              
              {/* Profile Card */}
              <section className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-2xs overflow-hidden">
                <div className="p-6 sm:p-8 space-y-8">
                  <div>
                    <h2 className="font-heading text-xl font-extrabold text-neutral-900 dark:text-neutral-100">Informations Personnelles</h2>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Gérez votre identité publique en tant qu'auteur.</p>
                  </div>
                  
                  {feedback && (
                    <div
                      role="status"
                      className={`px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2 animate-fadeIn border ${
                        feedback.kind === "success"
                          ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300"
                          : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900 text-red-700 dark:text-red-300"
                      }`}
                    >
                      {feedback.kind === "success" ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                      )}
                      {feedback.text}
                    </div>
                  )}

                  {/* Avatar Section */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pb-6 border-b border-neutral-100 dark:border-neutral-800">
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      aria-label="Modifier l'avatar"
                      className="w-24 h-24 rounded-full bg-orange-100 dark:bg-orange-950/40 border-2 border-orange-200 dark:border-orange-900 flex items-center justify-center text-secondary font-extrabold font-heading text-3xl shadow-sm shrink-0 relative overflow-hidden group cursor-pointer disabled:cursor-wait"
                    >
                      {avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={avatarUrl} alt="Avatar de l'auteur" className="w-full h-full object-cover" />
                      ) : (
                        <span className="group-hover:opacity-0 transition-opacity">{userInitials}</span>
                      )}

                      <span className="absolute inset-0 bg-black/45 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity">
                        {uploadingAvatar ? (
                          <span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>
                        ) : (
                          <>
                            <Upload className="w-6 h-6 mb-1" />
                            <span className="text-[9px] font-bold uppercase tracking-wider">Modifier</span>
                          </>
                        )}
                      </span>
                    </button>

                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(e) => { handleAvatarFile(e.target.files?.[0]); e.target.value = ""; }}
                    />

                    <div className="space-y-2">
                      <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-100">Avatar Auteur</h3>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm leading-relaxed">
                        Cet avatar vous représente sur la plateforme. Formats acceptés : JPG, PNG, WEBP. Taille max : 2 Mo.
                      </p>
                      <button
                        type="button"
                        onClick={() => avatarInputRef.current?.click()}
                        disabled={uploadingAvatar}
                        className="text-xs font-bold text-secondary hover:text-orange-600 bg-orange-50 dark:bg-orange-950/40 px-3 py-1.5 rounded-lg border border-orange-100 dark:border-orange-900 transition-colors disabled:opacity-60"
                      >
                        {uploadingAvatar ? "Envoi en cours…" : "Télécharger une image"}
                      </button>
                    </div>
                  </div>

                  {/* Form Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-2 uppercase tracking-wider">Nom complet / Nom de plume</label>
                      <input 
                        type="text" 
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm font-medium focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-all" 
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-2 uppercase tracking-wider">Adresse E-mail</label>
                      <input 
                        type="email" 
                        value={displayEmail} 
                        disabled
                        className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 text-sm font-medium bg-neutral-50 dark:bg-neutral-800/60 text-neutral-500 dark:text-neutral-400 outline-none cursor-not-allowed" 
                      />
                      <p className="text-[10px] text-neutral-400 dark:text-neutral-500 dark:text-neutral-400 mt-1.5">L'adresse e-mail associée à votre compte ne peut pas être modifiée ici.</p>
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-2 uppercase tracking-wider">Biographie de l'Auteur</label>
                      <textarea 
                        rows={4} 
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Rédigez une brève présentation pour vos lecteurs... Ex: Auteur passionné de science-fiction..."
                        className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm font-medium focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-all resize-y"
                      ></textarea>
                    </div>
                  </div>
                </div>
              </section>

              {/* Social Links Card */}
              <section className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-2xs overflow-hidden">
                <div className="p-6 sm:p-8 space-y-6">
                  <div>
                    <h2 className="font-heading text-xl font-extrabold text-neutral-900 dark:text-neutral-100">Présence en ligne</h2>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Ajoutez vos liens pour renforcer votre profil public d'auteur.</p>
                  </div>

                  <div className="space-y-4">
                    
                    <div>
                      <label className="flex items-center gap-2 text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-2 uppercase tracking-wider">
                        <Globe className="w-4 h-4 text-neutral-400" />
                        Site Web Personnel
                      </label>
                      <input 
                        type="url" 
                        value={websiteUrl}
                        onChange={(e) => setWebsiteUrl(e.target.value)}
                        placeholder="https://www.mon-site.com"
                        className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm font-medium focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-all" 
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-2 uppercase tracking-wider">
                        <AtSign className="w-4 h-4 text-blue-400" />
                        Profil X (Twitter)
                      </label>
                      <div className="flex">
                        <span className="inline-flex items-center px-4 rounded-l-xl border border-r-0 border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 text-neutral-500 dark:text-neutral-400 text-sm font-medium">
                          x.com/
                        </span>
                        <input 
                          type="text" 
                          value={twitterUrl}
                          onChange={(e) => setTwitterUrl(e.target.value)}
                          placeholder="votre_pseudo"
                          className="flex-1 px-4 py-3 rounded-r-xl border border-neutral-200 dark:border-neutral-800 text-sm font-medium focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-all" 
                        />
                      </div>
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-2 uppercase tracking-wider">
                        <ShoppingCart className="w-4 h-4 text-amber-500" />
                        Page Auteur Amazon
                      </label>
                      <input 
                        type="url" 
                        value={amazonUrl}
                        onChange={(e) => setAmazonUrl(e.target.value)}
                        placeholder="https://www.amazon.fr/author/..."
                        className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm font-medium focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-all" 
                      />
                    </div>

                  </div>
                </div>
              </section>

              {/* Action Bar */}
              <div className="flex justify-end pb-8">
                <button 
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-secondary text-white px-8 py-3.5 rounded-xl font-extrabold text-sm hover:bg-orange-600 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 cursor-pointer disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                      <span>Enregistrement...</span>
                    </>
                  ) : (
                    "Enregistrer les modifications"
                  )}
                </button>
              </div>

            </div>
          </div>
        </main>
    </AppLayout>
  );
}
