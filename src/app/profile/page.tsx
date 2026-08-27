"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import { useUser } from "@/hooks/useUser";
import { createClient } from "@/lib/supabase/client";
import { 
  User, 
  CreditCard, 
  Globe, 
  AtSign, 
  ShoppingCart,
  Upload,
  CheckCircle2
} from "lucide-react";

export default function SettingsPage() {
  const { user, profile, displayName, displayEmail } = useUser();
  const userInitials = displayName ? displayName.substring(0, 2).toUpperCase() : "AU";
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [twitterUrl, setTwitterUrl] = useState("");
  const [amazonUrl, setAmazonUrl] = useState("");
  
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (profile || displayName) {
      setFullName(profile?.full_name || displayName || "");
      setBio(profile?.bio || "");
      setWebsiteUrl(profile?.website_url || "");
      setTwitterUrl(profile?.twitter_url || "");
      setAmazonUrl(profile?.amazon_url || "");
    }
  }, [profile, displayName]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setMessage("");

    try {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          updated_at: new Date().toISOString()
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      const { error: authError } = await supabase.auth.updateUser({
        data: {
          bio: bio,
          website_url: websiteUrl,
          twitter_url: twitterUrl,
          amazon_url: amazonUrl,
        }
      });

      if (authError) throw authError;
      setMessage("Profil mis à jour avec succès !");
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => setMessage(""), 3000);
    } catch (err: any) {
      setMessage("Erreur : " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
        <header className="bg-white/80 backdrop-blur-md border-b border-neutral-100 sticky top-0 z-20 h-16 px-4 md:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-neutral-600 hover:text-neutral-900 bg-neutral-100 px-3 py-2 rounded-xl transition-all">
              <span className="material-symbols-outlined text-base">arrow_back</span>
              <span>Tableau de bord</span>
            </Link>
            <h1 className="font-heading font-extrabold text-xl text-neutral-900 flex items-center gap-2">
              <User className="w-5 h-5 text-secondary" strokeWidth={2.5} />
              <span>Mon Profil</span>
            </h1>
          </div>
          <Link href="/settings" className="flex items-center gap-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold px-4 py-2 rounded-xl transition-all">
            <span className="material-symbols-outlined text-base">settings</span>
            <span className="hidden sm:inline">Paramètres</span>
          </Link>
        </header>

        <main className="p-4 sm:p-6 md:p-10 max-w-5xl mx-auto w-full space-y-8">
          <div className="flex flex-col gap-8">


            {/* Settings Content */}
            <div className="flex-1 space-y-6">
              
              {/* Profile Card */}
              <section className="bg-white rounded-3xl border border-neutral-200/80 shadow-2xs overflow-hidden">
                <div className="p-6 sm:p-8 space-y-8">
                  <div>
                    <h2 className="font-heading text-xl font-extrabold text-neutral-900">Informations Personnelles</h2>
                    <p className="text-xs text-neutral-500 mt-1">Gérez votre identité publique en tant qu'auteur.</p>
                  </div>
                  
                  {message && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2 animate-fadeIn">
                      <CheckCircle2 className="w-4 h-4" />
                      {message}
                    </div>
                  )}

                  {/* Avatar Section */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pb-6 border-b border-neutral-100">
                    <div className="w-24 h-24 rounded-full bg-orange-100 border-2 border-orange-200 flex items-center justify-center text-secondary font-extrabold font-heading text-3xl shadow-sm shrink-0 relative overflow-hidden group">
                      <span className="group-hover:opacity-0 transition-opacity">{userInitials}</span>
                      
                      {/* Hover Overlay for Avatar Upload */}
                      <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        <Upload className="w-6 h-6 mb-1" />
                        <span className="text-[9px] font-bold uppercase tracking-wider">Modifier</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="text-sm font-bold text-neutral-800">Avatar Auteur</h3>
                      <p className="text-xs text-neutral-500 max-w-sm leading-relaxed">
                        Cet avatar vous représente sur la plateforme. Formats recommandés : JPG, PNG. Taille max : 2MB.
                      </p>
                      <button className="text-xs font-bold text-secondary hover:text-orange-600 bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-100 transition-colors">
                        Télécharger une image
                      </button>
                    </div>
                  </div>

                  {/* Form Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-neutral-700 mb-2 uppercase tracking-wider">Nom complet / Nom de plume</label>
                      <input 
                        type="text" 
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full px-4 py-3 rounded-xl border border-neutral-200 text-sm font-medium focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-all" 
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-neutral-700 mb-2 uppercase tracking-wider">Adresse E-mail</label>
                      <input 
                        type="email" 
                        value={displayEmail} 
                        disabled
                        className="w-full px-4 py-3 rounded-xl border border-neutral-200 text-sm font-medium bg-neutral-50 text-neutral-500 outline-none cursor-not-allowed" 
                      />
                      <p className="text-[10px] text-neutral-400 mt-1.5">L'adresse e-mail associée à votre compte ne peut pas être modifiée ici.</p>
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-neutral-700 mb-2 uppercase tracking-wider">Biographie de l'Auteur</label>
                      <textarea 
                        rows={4} 
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Rédigez une brève présentation pour vos lecteurs... Ex: Auteur passionné de science-fiction..."
                        className="w-full px-4 py-3 rounded-xl border border-neutral-200 text-sm font-medium focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-all resize-y"
                      ></textarea>
                    </div>
                  </div>
                </div>
              </section>

              {/* Social Links Card */}
              <section className="bg-white rounded-3xl border border-neutral-200/80 shadow-2xs overflow-hidden">
                <div className="p-6 sm:p-8 space-y-6">
                  <div>
                    <h2 className="font-heading text-xl font-extrabold text-neutral-900">Présence en ligne</h2>
                    <p className="text-xs text-neutral-500 mt-1">Ajoutez vos liens pour renforcer votre profil public d'auteur.</p>
                  </div>

                  <div className="space-y-4">
                    
                    <div>
                      <label className="flex items-center gap-2 text-xs font-bold text-neutral-700 mb-2 uppercase tracking-wider">
                        <Globe className="w-4 h-4 text-neutral-400" />
                        Site Web Personnel
                      </label>
                      <input 
                        type="url" 
                        value={websiteUrl}
                        onChange={(e) => setWebsiteUrl(e.target.value)}
                        placeholder="https://www.mon-site.com"
                        className="w-full px-4 py-3 rounded-xl border border-neutral-200 text-sm font-medium focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-all" 
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-xs font-bold text-neutral-700 mb-2 uppercase tracking-wider">
                        <AtSign className="w-4 h-4 text-blue-400" />
                        Profil X (Twitter)
                      </label>
                      <div className="flex">
                        <span className="inline-flex items-center px-4 rounded-l-xl border border-r-0 border-neutral-200 bg-neutral-50 text-neutral-500 text-sm font-medium">
                          x.com/
                        </span>
                        <input 
                          type="text" 
                          value={twitterUrl}
                          onChange={(e) => setTwitterUrl(e.target.value)}
                          placeholder="votre_pseudo"
                          className="flex-1 px-4 py-3 rounded-r-xl border border-neutral-200 text-sm font-medium focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-all" 
                        />
                      </div>
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-xs font-bold text-neutral-700 mb-2 uppercase tracking-wider">
                        <ShoppingCart className="w-4 h-4 text-amber-500" />
                        Page Auteur Amazon
                      </label>
                      <input 
                        type="url" 
                        value={amazonUrl}
                        onChange={(e) => setAmazonUrl(e.target.value)}
                        placeholder="https://www.amazon.fr/author/..."
                        className="w-full px-4 py-3 rounded-xl border border-neutral-200 text-sm font-medium focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-all" 
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
