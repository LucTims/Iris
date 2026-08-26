"use client";

import { useState } from "react";
import Link from "next/link";
import { useUser } from "@/hooks/useUser";

export default function TopHeader() {
  const { displayName, displayEmail, signOut, isAdmin, walletBalance } = useUser();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userInitials = displayName ? displayName.substring(0, 2).toUpperCase() : "AU";

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-neutral-200/80 sticky top-0 z-30 h-16 px-4 md:px-8 flex items-center justify-between gap-4 shrink-0">
      
      {/* Mobile Header Title */}
      <div className="flex items-center gap-2 md:hidden">
        <Link href="/dashboard" className="font-heading font-extrabold text-2xl text-secondary">
          Iris
        </Link>
      </div>

      {/* Spacer */}
      <div className="flex-1"></div>

      {/* Right Header Actions */}
      <div className="flex items-center gap-3 relative">
        <Link href="/" className="hidden lg:flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200/70 px-3 py-2 rounded-xl transition-all">
          <span className="material-symbols-outlined text-base">arrow_back</span>
          <span>Accueil du site</span>
        </Link>

        <Link href="/projects/new" className="flex items-center gap-2 bg-secondary hover:bg-orange-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-xs">
          <span className="material-symbols-outlined text-base">add</span>
          <span className="hidden sm:inline">Nouveau Livre</span>
        </Link>
        
        <Link href="/pricing" className="flex items-center gap-1.5 bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 text-yellow-800 text-xs font-bold px-3 py-1.5 rounded-xl transition-all">
          <span className="text-sm">🪙</span>
          <span>{walletBalance}</span>
        </Link>

        <button className="w-9 h-9 rounded-xl border border-neutral-200 flex items-center justify-center text-neutral-600 hover:bg-neutral-50 transition-colors shrink-0">
          <span className="material-symbols-outlined text-lg">notifications</span>
        </button>

        {/* User Profile Dropdown Button */}
        <div className="relative shrink-0">
          <button 
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="w-9 h-9 rounded-full bg-orange-100 border border-orange-300 flex items-center justify-center text-secondary font-extrabold font-heading text-sm shadow-2xs hover:ring-2 hover:ring-orange-300 transition-all cursor-pointer"
            title="Menu Profil"
          >
            {userInitials}
          </button>

          {/* Dropdown Menu */}
          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-neutral-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 py-3 border-b border-neutral-100">
                <p className="font-heading font-bold text-sm text-neutral-900">{displayName}</p>
                <p className="text-xs text-neutral-500 truncate">{displayEmail}</p>
                <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full bg-orange-50 border border-orange-200 text-[10px] font-bold text-secondary">
                  Plan Gratuit
                </span>
              </div>

              <div className="py-1">
                <Link 
                  href="/dashboard" 
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900"
                >
                  <span className="material-symbols-outlined text-base text-neutral-400">dashboard</span>
                  <span>Tableau de bord</span>
                </Link>
                <Link 
                  href="/projects" 
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900"
                >
                  <span className="material-symbols-outlined text-base text-neutral-400">menu_book</span>
                  <span>Mes Livres & Projets</span>
                </Link>
                <Link 
                  href="/settings" 
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900"
                >
                  <span className="material-symbols-outlined text-base text-neutral-400">settings</span>
                  <span>Paramètres du compte</span>
                </Link>
                <Link 
                  href="/" 
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900"
                >
                  <span className="material-symbols-outlined text-base text-neutral-400">home</span>
                  <span>Page d&apos;accueil du site</span>
                </Link>
                
                {isAdmin && (
                  <Link 
                    href="/admin" 
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                  >
                    <span className="material-symbols-outlined text-base text-emerald-600">admin_panel_settings</span>
                    <span>Espace Administration</span>
                  </Link>
                )}
              </div>

              <div className="pt-1 border-t border-neutral-100">
                <button 
                  onClick={() => { setUserMenuOpen(false); signOut(); }}
                  className="w-full text-left flex items-center gap-3 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors"
                >
                  <span className="material-symbols-outlined text-base text-red-500">logout</span>
                  <span>Se déconnecter</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
