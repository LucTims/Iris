"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push("/dashboard");
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
              Créer un compte
            </h1>
            <p className="text-base md:text-lg text-neutral-600">
              Rejoignez LivreGénie et donnez vie à vos livres.
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-base font-semibold text-neutral-700 mb-2">Nom complet</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 text-xl">person</span>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jean Dupont" 
                  className="w-full pl-12 pr-4 p-4 text-base border border-neutral-300 rounded-xl focus:ring-2 focus:ring-secondary focus:border-secondary transition-all outline-none bg-white text-neutral-900 placeholder:text-neutral-400"
                  required 
                />
              </div>
            </div>

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
              <label className="block text-base font-semibold text-neutral-700 mb-2">Mot de passe</label>
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

            <button 
              type="submit" 
              className="w-full bg-secondary hover:bg-secondary/90 py-4 text-lg font-semibold text-white rounded-xl shadow-sm transition-all mt-4"
            >
              Créer mon compte
            </button>
          </form>

          <div className="pt-8 border-t border-neutral-200 text-center mt-8">
            <p className="text-base text-neutral-600">
              Déjà un compte ?{" "}
              <Link href="/login" className="font-semibold text-secondary hover:underline">
                Se connecter
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
