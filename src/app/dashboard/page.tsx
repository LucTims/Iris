"use client";

import { useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import QuillAnimation from "@/components/QuillAnimation";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const hasProjects = false; // Toggle to true when user has projects

  const myBookProjects = [
    {
      id: 1,
      title: "Les Secrets de la Comptabilité",
      subtitle: "Guide pratique pour entrepreneurs",
      pages: "124 pages",
      words: "38 400 mots",
      progress: 75,
      lastEdited: "Modifié il y a 2h",
      status: "En rédaction",
      image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBmHjpfXMS5mZURo-hMytc9lu01zIIe20Dc2PJjc4tAv-6TEZTzX4_azD3023Ugo2wLJ_LUG7UULw8Yme0I-X6syRwZBYkeOCiO9LEnodNUZnWKODxKM7YGva5CqnMu0Zu_eOhSaVcY8fTwwrR9mcXRcOWI4rmA6HYs1mlwsoDOseaaHKK6V3LyqBSzeNp8xmleiO1ULIGU3NazhNU0XhN1-pRXGL7h3aIGa-pBV8wktip5xmho4CU"
    },
    {
      id: 2,
      title: "Cuisine & Saveurs d'Afrique de l'Ouest",
      subtitle: "Recettes traditionnelles et secrets culinaires",
      pages: "45 pages",
      words: "14 200 mots",
      progress: 42,
      lastEdited: "Modifié hier",
      status: "En rédaction",
      image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDJ0119WJs_FCdKQvLh1ekfLcgIY2g0W2VxrO-uU5IxzxmuB9KpEGUHZ4KPlDFr4IXeOTYN7rCPTsfG-4RMCet_q12Qhqcs7cab0wqSaE1us5REYRc2X3FZq-QCy3-DTxXLhZWDI0Rj4MAZ83zgth6I23Y0zWEVEBmpg8AyFramQCi1nm8XAar7nkPXdGXGmi_lzZUtyOS3MfwWL5Ibxw2BR_LC2Juf-25_J-t3Is7lIypYjQrOYWQ"
    },
    {
      id: 3,
      title: "L'Épopée de l'Empire du Mali",
      subtitle: "Roman et fresque historique",
      pages: "312 pages",
      words: "92 800 mots",
      progress: 90,
      lastEdited: "Modifié il y a 3 jours",
      status: "Mise en page",
      image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDGRAgG7Jw7lhtyjl_qycdr17eAh1sSdzeBtBqV6Jf_pca9o7vpcgG1l5N8fdVANh6k6KkiWrFxl5CYNn1G54_uXtfxm29eSLlUSZwvUjmcneOfim7dPuqjsRaMSc8XMHzziv2W3qvt12vJa8cngWhZXEGheRfcCjQWLIVkqWm2qWLC7HvGOf0HpWE8YZvfCK05Pa2T5a4G1pFkjEwo6nYh8QZdznpTywVswOT2-Ih9su6bp6cznEY"
    }
  ];

  return (
    <div className="min-h-screen bg-[#F9FAFB] font-body text-neutral-900 flex flex-col md:flex-row">
      {/* GLOBAL REUSABLE SIDEBAR */}
      <Sidebar />

      {/* ================= MAIN CONTENT AREA ================= */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-10">
        
        {/* Top Header Bar (Seamless without dividing border line) */}
        <header className="bg-[#F9FAFB] sticky top-0 z-30 h-16 px-4 md:px-8 flex items-center justify-between gap-4">
          
          {/* Mobile Header Title */}
          <div className="flex items-center gap-2 md:hidden">
            <Link href="/" className="font-heading font-extrabold text-2xl text-secondary">
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
              <span>Nouveau Livre</span>
            </Link>
            
            <button className="w-9 h-9 rounded-xl border border-neutral-200 flex items-center justify-center text-neutral-600 hover:bg-neutral-50 transition-colors">
              <span className="material-symbols-outlined text-lg">notifications</span>
            </button>

            {/* User Profile Dropdown Button */}
            <div className="relative">
              <button 
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="w-9 h-9 rounded-full bg-orange-100 border border-orange-300 flex items-center justify-center text-secondary font-extrabold font-heading text-sm shadow-2xs hover:ring-2 hover:ring-orange-300 transition-all cursor-pointer"
                title="Menu Profil"
              >
                ML
              </button>

              {/* Dropdown Menu */}
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-neutral-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-3 border-b border-neutral-100">
                    <p className="font-heading font-bold text-sm text-neutral-900">Martin Laurent</p>
                    <p className="text-xs text-neutral-500 truncate">martin@exemple.com</p>
                    <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full bg-orange-50 border border-orange-200 text-[10px] font-bold text-secondary">
                      Plan Pro Auteur
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
                  </div>

                  <div className="pt-1 border-t border-neutral-100">
                    <Link 
                      href="/login" 
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <span className="material-symbols-outlined text-base text-red-500">logout</span>
                      <span>Se déconnecter</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dashboard Main Container */}
        <main className="p-4 sm:p-6 md:p-10 max-w-6xl mx-auto w-full space-y-8">
          
          {/* 1. IRIS ANNOUNCEMENT BANNER */}
          <div className="bg-gradient-to-r from-orange-500 via-secondary to-amber-500 rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="max-w-2xl space-y-3 z-10">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white font-bold text-[11px] uppercase tracking-wider">
                <span className="material-symbols-outlined text-sm">auto_awesome</span>
                <span>Version Iris 3.5 Pro</span>
              </span>
              <h2 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight leading-snug">
                Co-rédigez des livres 2x plus vite avec l&apos;IA
              </h2>
              <p className="text-sm text-white/90 leading-relaxed">
                Structurez vos chapitres, affinez le style littéraire et générez vos couvertures HD directement adaptées aux exigences d&apos;Amazon KDP.
              </p>
            </div>

            <Link href="/projects/new" className="shrink-0 w-full md:w-auto z-10">
              <button className="w-full md:w-auto bg-white text-secondary hover:bg-orange-50 text-xs sm:text-sm font-bold px-6 py-3.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2">
                <span>Créer un nouveau livre</span>
                <span className="material-symbols-outlined text-base">menu_book</span>
              </button>
            </Link>
          </div>

          {/* 2. PERSONALIZED GREETING */}
          <div className="space-y-1">
            <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight flex items-center gap-2">
              <span>Bienvenue Martin !</span>
              <span className="text-2xl">✍️</span>
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 flex items-center gap-1.5 pt-1">
              <span>💡</span>
              <span>Aujourd&apos;hui est une excellente journée pour avancer sur votre projet &quot;Les Secrets de la Comptabilité&quot;.</span>
            </p>
          </div>

          {/* QUILL ANIMATION — Empty State Hero */}
          {!hasProjects && (
            <QuillAnimation />
          )}

          {/* 4. IRIS CORE METRICS (3 KPI Cards) — Only when projects exist */}
          {hasProjects && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            
            {/* Card 1: Books in progress */}
            <div className="bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-2xs relative flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <span className="material-symbols-outlined text-secondary text-2xl">menu_book</span>
                <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">+1 ce mois</span>
              </div>
              <div>
                <span className="font-heading font-extrabold text-3xl text-neutral-900 block mb-1">
                  4 Projets
                </span>
                <span className="text-xs font-semibold text-neutral-500">Livres en cours de rédaction</span>
              </div>
            </div>

            {/* Card 2: AI Words Generated */}
            <div className="bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-2xs relative flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <span className="material-symbols-outlined text-secondary text-2xl">auto_awesome</span>
                <span className="text-[11px] font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full">+24.5k cette semaine</span>
              </div>
              <div>
                <span className="font-heading font-extrabold text-3xl text-neutral-900 block mb-1">
                  148 500 mots
                </span>
                <span className="text-xs font-semibold text-neutral-500">Mots générés par Iris</span>
              </div>
            </div>

            {/* Card 3: Downloads & Readers */}
            <div className="bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-2xs relative flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <span className="material-symbols-outlined text-secondary text-2xl">group</span>
                <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">+18% engagement</span>
              </div>
              <div>
                <span className="font-heading font-extrabold text-3xl text-neutral-900 block mb-1">
                  1 240
                </span>
                <span className="text-xs font-semibold text-neutral-500">Lecteurs & Téléchargements</span>
              </div>
            </div>

          </div>
          )}

          {/* 5. MES LIVRES & PROJETS EN COURS — Only when projects exist */}
          {hasProjects && (
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading font-bold text-xl text-neutral-900">Mes Livres &amp; Projets en cours</h3>
                <p className="text-xs text-neutral-500">Poursuivez la rédaction de vos ouvrages là où vous vous étiez arrêté</p>
              </div>
              <Link href="/redaction">
                <button className="bg-white border border-neutral-200 text-neutral-700 text-xs font-bold px-4 py-2 rounded-xl hover:bg-neutral-50 transition-colors">
                  + Nouveau Projet
                </button>
              </Link>
            </div>

            {/* Book Projects Cards */}
            <div className="grid grid-cols-1 gap-4">
              {myBookProjects.map((book) => (
                <div 
                  key={book.id} 
                  className="bg-white rounded-3xl border border-neutral-200/80 p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
                >
                  <div className="flex items-center gap-4">
                    <img 
                      src={book.image} 
                      alt={book.title} 
                      className="w-14 h-18 object-cover rounded-xl border border-neutral-200 shadow-xs shrink-0" 
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-secondary bg-orange-50 px-2 py-0.5 rounded-md">
                          {book.status}
                        </span>
                        <span className="text-xs text-neutral-400">• {book.lastEdited}</span>
                      </div>
                      <h4 className="font-heading font-bold text-base text-neutral-900">
                        {book.title}
                      </h4>
                      <p className="text-xs text-neutral-500">
                        {book.subtitle} — <strong className="text-neutral-700">{book.pages} ({book.words})</strong>
                      </p>
                    </div>
                  </div>

                  {/* Progress & Action */}
                  <div className="w-full md:w-64 space-y-2 shrink-0">
                    <div className="flex justify-between items-center text-xs font-bold text-neutral-700">
                      <span>Progression</span>
                      <span>{book.progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-secondary rounded-full transition-all duration-500" 
                        style={{ width: `${book.progress}%` }}
                      ></div>
                    </div>
                    <Link href="/redaction" className="block pt-1">
                      <button className="w-full bg-neutral-100 hover:bg-secondary hover:text-white text-neutral-800 text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1">
                        <span>Reprendre la rédaction</span>
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                      </button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
          )}

          {/* 6. FONCTIONNALITÉS & OUTILS IRIS */}
          <div className="space-y-4 pt-6">
            <div>
              <h3 className="font-heading font-bold text-xl text-neutral-900">Outils &amp; Fonctionnalités Iris</h3>
              <p className="text-xs text-neutral-500">Exploitez la puissance de l&apos;IA pour concevoir et publier vos livres</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Tool 1 */}
              <div className="bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-2xs flex flex-col justify-between space-y-4 hover:border-orange-200 transition-colors">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-orange-100 text-secondary flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-2xl">auto_awesome</span>
                  </div>
                  <h4 className="font-heading font-bold text-base text-neutral-900 mb-1">Co-Écriture IA Interactive</h4>
                  <p className="text-xs text-neutral-500 leading-relaxed">Dialoguez avec Iris pour structurer vos paragraphes, enrichir vos idées et adapter le ton littéraire.</p>
                </div>
                <Link href="/redaction">
                  <button className="w-full bg-neutral-50 hover:bg-neutral-100 text-neutral-900 text-xs font-bold py-2.5 rounded-xl border border-neutral-200 transition-colors">
                    Ouvrir le studio →
                  </button>
                </Link>
              </div>

              {/* Tool 2 */}
              <div className="bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-2xs flex flex-col justify-between space-y-4 hover:border-orange-200 transition-colors">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-orange-100 text-secondary flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-2xl">palette</span>
                  </div>
                  <h4 className="font-heading font-bold text-base text-neutral-900 mb-1">Studio de Couvertures HD</h4>
                  <p className="text-xs text-neutral-500 leading-relaxed">Générez des couvertures visuelles professionnelles adaptées au format Amazon KDP, Kobo et Print.</p>
                </div>
                <Link href="/redaction">
                  <button className="w-full bg-neutral-50 hover:bg-neutral-100 text-neutral-900 text-xs font-bold py-2.5 rounded-xl border border-neutral-200 transition-colors">
                    Générer un visuel →
                  </button>
                </Link>
              </div>

              {/* Tool 3 */}
              <div className="bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-2xs flex flex-col justify-between space-y-4 hover:border-orange-200 transition-colors">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-orange-100 text-secondary flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-2xl">download</span>
                  </div>
                  <h4 className="font-heading font-bold text-base text-neutral-900 mb-1">Exportation Multi-Format</h4>
                  <p className="text-xs text-neutral-500 leading-relaxed">Téléchargez vos livres en un clic aux formats EPUB et PDF prêts pour la vente immédiate.</p>
                </div>
                <Link href="/docs">
                  <button className="w-full bg-neutral-50 hover:bg-neutral-100 text-neutral-900 text-xs font-bold py-2.5 rounded-xl border border-neutral-200 transition-colors">
                    Exporter un livre →
                  </button>
                </Link>
              </div>

            </div>
          </div>

        </main>
      </div>

      {/* ================= MOBILE BOTTOM NAVIGATION BAR ================= */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 z-50 px-4 py-2 flex items-center justify-around">
        <Link href="/dashboard" className="flex flex-col items-center gap-1 text-secondary font-bold">
          <span className="material-symbols-outlined text-xl">dashboard</span>
          <span className="text-[10px]">Accueil</span>
        </Link>
        <Link href="/projects" className="flex flex-col items-center gap-1 text-neutral-500 hover:text-neutral-900">
          <span className="material-symbols-outlined text-xl">menu_book</span>
          <span className="text-[10px]">Mes Livres</span>
        </Link>
        <Link href="/billing" className="flex flex-col items-center gap-1 text-neutral-500 hover:text-neutral-900">
          <span className="material-symbols-outlined text-xl">credit_card</span>
          <span className="text-[10px]">Abonnement</span>
        </Link>
        <Link href="/settings" className="flex flex-col items-center gap-1 text-neutral-500 hover:text-neutral-900">
          <span className="material-symbols-outlined text-xl">settings</span>
          <span className="text-[10px]">Menu</span>
        </Link>
      </div>

    </div>
  );
}
