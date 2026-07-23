"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [usePassword, setUsePassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Allow login redirect
    if (email) {
      router.push("/dashboard");
    } else {
      setError("Veuillez renseigner votre adresse e-mail.");
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row font-body bg-white text-neutral-900">
      
      {/* ================= LEFT PANEL (DARK BRAND BRANDING) ================= */}
      <div className="lg:w-[45%] bg-[#0D0D0E] text-white p-8 md:p-16 flex flex-col justify-between relative overflow-hidden shrink-0">
        
        {/* Background Vector Graphic & Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-secondary/15 rounded-full blur-[140px] pointer-events-none"></div>
        
        {/* Abstract Curved Graphic Watermark (matching screenshot curved accent) */}
        <div className="absolute -bottom-24 -left-24 w-96 h-96 border-[40px] border-secondary/20 rounded-full pointer-events-none"></div>
        <div className="absolute -bottom-36 -left-36 w-[500px] h-[500px] border-[20px] border-orange-500/10 rounded-full pointer-events-none"></div>

        {/* Top Logo */}
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-white font-heading font-extrabold text-xl shadow-md group-hover:scale-105 transition-transform">
              I
            </div>
            <span className="font-heading font-extrabold text-3xl tracking-tight text-white">
              Iris
            </span>
          </Link>
        </div>

        {/* Hero Copy Text */}
        <div className="relative z-10 my-12 max-w-lg space-y-4">
          <h1 className="font-heading text-4xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Bienvenue dans l&apos;espace <em className="text-secondary not-italic">Iris.</em>
          </h1>
          <p className="text-base sm:text-lg text-neutral-400 font-normal leading-relaxed">
            Retrouvez ici l&apos;ensemble de vos livres numériques, projets de rédaction et visuels créés avec l&apos;assistance d&apos;Iris IA.
          </p>
        </div>

        {/* Footer Note */}
        <div className="relative z-10 text-xs text-neutral-500 font-medium">
          © {new Date().getFullYear()} BoomBooks. Tous droits réservés.
        </div>
      </div>

      {/* ================= RIGHT PANEL (AUTH FORM) ================= */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 md:p-16 bg-white relative">
        <div className="w-full max-w-md mx-auto space-y-8">
          
          {/* Header */}
          <div className="space-y-2">
            {/* Logo shown on mobile */}
            <div className="lg:hidden mb-6">
              <Link href="/" className="inline-flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-white font-heading font-bold text-lg">
                  I
                </div>
                <span className="font-heading font-bold text-2xl text-neutral-900">Iris</span>
              </Link>
            </div>

            <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight">
              Connexion
            </h2>
            <p className="text-sm text-neutral-500 leading-relaxed">
              Accédez à votre compte avec votre adresse e-mail ou via vos comptes sociaux.
            </p>
          </div>

          {/* Social OAuth Buttons Stack */}
          <div className="space-y-3">
            {/* Google */}
            <button 
              type="button" 
              onClick={() => router.push("/dashboard")}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-neutral-200 hover:border-neutral-300 rounded-2xl text-sm font-bold text-neutral-800 bg-white hover:bg-neutral-50/80 transition-all shadow-2xs"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>Continuer avec Google</span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-6">
            <div className="w-full border-t border-neutral-200"></div>
            <span className="absolute bg-white px-4 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              ou
            </span>
          </div>

          {/* Email Login Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 text-red-700 border border-red-200 px-4 py-3 rounded-xl text-xs font-semibold">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1.5 uppercase tracking-wider">
                Adresse e-mail *
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 text-lg">
                  mail
                </span>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@exemple.com" 
                  className="w-full pl-11 pr-4 py-3 text-sm border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all outline-none bg-white text-neutral-900 placeholder:text-neutral-400"
                  required 
                />
              </div>
            </div>

            {usePassword && (
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">
                    Mot de passe *
                  </label>
                  <button type="button" onClick={() => setUsePassword(false)} className="text-xs text-secondary hover:underline font-semibold">
                    Connexion par code
                  </button>
                </div>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 text-lg">
                    lock
                  </span>
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••" 
                    className="w-full pl-11 pr-4 py-3 text-sm border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all outline-none bg-white text-neutral-900 placeholder:text-neutral-400"
                  />
                </div>
              </div>
            )}

            {!usePassword && (
              <div className="flex justify-end">
                <button type="button" onClick={() => setUsePassword(true)} className="text-xs text-neutral-500 hover:text-neutral-900 font-semibold">
                  Utiliser un mot de passe
                </button>
              </div>
            )}

            <button 
              type="submit" 
              className="w-full bg-secondary hover:bg-orange-600 text-white font-bold py-3.5 rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 group mt-2"
            >
              <span>{usePassword ? "Se connecter" : "Recevoir un code par e-mail"}</span>
              <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">
                arrow_forward
              </span>
            </button>
          </form>

          {/* Switch link */}
          <div className="pt-4 text-center border-t border-neutral-100">
            <p className="text-xs text-neutral-500 font-medium">
              Pas encore de compte ?{" "}
              <Link href="/register" className="font-bold text-secondary hover:underline">
                Inscription ici
              </Link>
            </p>
          </div>

        </div>
      </div>

    </div>
  );
}
