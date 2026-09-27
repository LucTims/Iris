"use client";

import { useState } from "react";
import Link from "next/link";
import { useUser } from "@/hooks/useUser";
import { ArrowRight, Menu, X } from "lucide-react";
import { IrisMark } from "@/components/IrisLogo";

export default function LandingNavbar() {
  const { user } = useUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 w-full z-50 bg-white dark:bg-neutral-900/95 backdrop-blur-md border-b border-neutral-200/80 dark:border-neutral-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 sm:h-20 flex items-center justify-between">
        <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-1 group shrink-0">
          <IrisMark size={34} className="text-brand shrink-0 group-hover:scale-105 rotate-6 transition-transform" />
          <span className="font-heading font-extrabold text-2xl sm:text-3xl tracking-tight text-neutral-900">
            ris
          </span>
        </Link>

        {/* Center Links */}
        <div className="hidden md:flex items-center gap-8 font-semibold text-sm text-neutral-700 dark:text-neutral-300">
          <Link href="/presentation" className="hover:text-neutral-900 dark:text-neutral-100 transition-colors flex items-center gap-1.5 text-[#C84B31] font-bold">
            <span>Découvrir Iris</span>
            <span className="text-[10px] uppercase tracking-wider bg-[#FDF3F1] border border-[#F4C5BC] px-1.5 py-0.5 rounded-full font-bold">Livre offert</span>
          </Link>
          <Link href="/features" className="hover:text-neutral-900 dark:text-neutral-100 transition-colors">Fonctionnalités</Link>
          <Link href="/how-it-works" className="hover:text-neutral-900 dark:text-neutral-100 transition-colors">Comment ça marche</Link>
          <Link href="/pricing" className="hover:text-neutral-900 dark:text-neutral-100 transition-colors">Tarifs</Link>
        </div>

        {/* Right Action */}
        <div className="hidden md:flex items-center gap-5 shrink-0">
          <Link href="/login" className="font-semibold text-sm text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:text-neutral-100 transition-colors">
            Se connecter
          </Link>
          <Link href={user ? "/dashboard" : "/register"}>
            <button className="bg-[#C84B31] hover:bg-[#B83E26] text-white px-5 py-2.5 rounded-full text-sm font-semibold transition-all shadow-xs hover:shadow-sm flex items-center gap-1.5 cursor-pointer">
              <span>Commencer gratuitement</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-xl text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:text-neutral-100 hover:bg-neutral-100 dark:bg-neutral-800 transition-colors cursor-pointer"
          aria-label="Ouvrir le menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-5 pt-3 pb-6 space-y-3 shadow-lg animate-in slide-in-from-top-2 duration-150">
          <Link
            href="/presentation"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center justify-between py-2 text-sm font-bold text-[#C84B31]"
          >
            <span>Découvrir Iris & Livre offert</span>
            <span className="text-[10px] uppercase tracking-wider bg-[#FDF3F1] border border-[#F4C5BC] px-1.5 py-0.5 rounded-full font-bold">Gratuit</span>
          </Link>
          <Link
            href="/features"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:text-neutral-100"
          >
            Fonctionnalités
          </Link>
          <Link
            href="/how-it-works"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:text-neutral-100"
          >
            Comment ça marche
          </Link>
          <Link
            href="/pricing"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:text-neutral-100"
          >
            Tarifs
          </Link>
          <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex flex-col gap-2.5">
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 text-center text-sm font-semibold text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:text-neutral-100"
            >
              Se connecter
            </Link>
            <Link
              href={user ? "/dashboard" : "/register"}
              onClick={() => setMobileMenuOpen(false)}
            >
              <button className="w-full bg-[#C84B31] hover:bg-[#B83E26] text-white py-3 rounded-full text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer">
                <span>Commencer gratuitement</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
