"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email === "www.martau@gmail.com" && password === "Lucas*5002") {
      router.push("/dashboard");
    } else {
      setError("Identifiants incorrects. Veuillez réessayer.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-container-lowest relative overflow-hidden">
      <div className="w-full max-w-lg my-12 relative z-10 px-4">
        <div className="border border-neutral-200 shadow-sm rounded-2xl bg-white p-8 md:p-12">
          
          <div className="text-center mb-10">
            <Link href="/" className="font-heading text-4xl font-extrabold text-secondary inline-block mb-3 hover:opacity-90 transition-opacity">
              Iris
            </Link>
            <h1 className="text-4xl md:text-5xl font-extrabold text-neutral-900 tracking-tight mb-3">
              Bon retour !
            </h1>
            <p className="text-base md:text-lg text-neutral-600">
              Connectez-vous pour continuer votre chef-d&apos;œuvre.
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 text-red-700 border border-red-200 p-4 rounded-xl text-base font-semibold">
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-base font-semibold text-neutral-700 mb-2">Email</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 text-xl">mail</span>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com" 
                  className="w-full pl-12 pr-4 p-4 text-base border border-neutral-300 rounded-xl focus:ring-2 focus:ring-secondary focus:border-secondary transition-all outline-none bg-white text-neutral-900 placeholder:text-neutral-400"
                  required 
                />
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-base font-semibold text-neutral-700">Mot de passe</label>
                <Link href="#" className="text-sm font-semibold text-secondary hover:underline">Oublié ?</Link>
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 text-xl">lock</span>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  className="w-full pl-12 pr-4 p-4 text-base border border-neutral-300 rounded-xl focus:ring-2 focus:ring-secondary focus:border-secondary transition-all outline-none bg-white text-neutral-900 placeholder:text-neutral-400"
                  required 
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input type="checkbox" id="remember" className="w-5 h-5 rounded border-neutral-300 text-secondary focus:ring-secondary" />
              <label htmlFor="remember" className="text-base text-neutral-600">Se souvenir de moi</label>
            </div>

            <button 
              type="submit" 
              className="w-full bg-secondary hover:bg-secondary/90 py-4 text-lg font-semibold text-white rounded-xl shadow-sm transition-all mt-4"
            >
              Se Connecter
            </button>
          </form>

          <div className="mt-8 relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200"></div>
            </div>
            <div className="relative bg-white px-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              Ou continuer avec
            </div>
          </div>

          <div className="mt-6">
            <button className="w-full flex items-center justify-center gap-3 bg-white border border-neutral-300 p-4 rounded-xl text-base font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors shadow-sm">
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
              Google
            </button>
          </div>

          <div className="pt-8 border-t border-neutral-200 text-center mt-8">
            <p className="text-base text-neutral-600">
              Pas encore de compte ?{" "}
              <Link href="/register" className="font-semibold text-secondary hover:underline">
                Créer un compte
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
