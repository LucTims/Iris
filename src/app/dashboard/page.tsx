"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import QuillAnimation from "@/components/QuillAnimation";
import ExportBookModal from "@/components/ExportBookModal";
import { useUser } from "@/hooks/useUser";

export default function DashboardPage() {
  const { displayName, displayEmail, signOut, isAdmin } = useUser();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [selectedProjectForExport, setSelectedProjectForExport] = useState<any | null>(null);

  const handleOpenExportModal = (project: any) => {
    setSelectedProjectForExport(project);
    setIsExportModalOpen(true);
  };

  useEffect(() => {
    async function loadProjects() {
      try {
        const res = await fetch("/api/projects");
        if (res.ok) {
          const data = await res.json();
          setProjects(data.projects || []);
        }
      } catch (err) {
        console.error("Erreur de chargement des projets:", err);
      } finally {
        setLoading(false);
      }
    }
    loadProjects();
  }, []);

  const hasProjects = projects.length > 0;
  const userInitials = displayName ? displayName.substring(0, 2).toUpperCase() : "AU";

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
              <span>Bienvenue {displayName || "Utilisateur"} !</span>
              <span className="text-2xl">✍️</span>
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 flex items-center gap-1.5 pt-1">
              <span>💡</span>
              <span>{hasProjects ? `Aujourd'hui est une excellente journée pour avancer sur votre projet "${projects[0].title}".` : "Aujourd'hui est une excellente journée pour démarrer un nouveau projet."}</span>
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
                  {projects.length} Projet{projects.length !== 1 ? 's' : ''}
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
                  N/A
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
                  0
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
              <Link href="/projects/new">
                <button className="bg-white border border-neutral-200 text-neutral-700 text-xs font-bold px-4 py-2 rounded-xl hover:bg-neutral-50 transition-colors">
                  + Nouveau Projet
                </button>
              </Link>
            </div>

            {/* Book Projects Cards */}
            <div className="grid grid-cols-1 gap-4">
              {projects.map((book) => (
                <div 
                  key={book.id} 
                  className="bg-white rounded-3xl border border-neutral-200/80 p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-16 bg-orange-50 border border-orange-200 rounded-xl flex items-center justify-center text-secondary text-xl font-bold shrink-0">
                      📖
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-secondary bg-orange-50 px-2 py-0.5 rounded-md">
                          {book.status || "En cours"}
                        </span>
                        <span className="text-xs text-neutral-400">• {new Date(book.updated_at || book.created_at).toLocaleDateString()}</span>
                      </div>
                      <h4 className="font-heading font-bold text-base text-neutral-900">
                        {book.title}
                      </h4>
                      <p className="text-xs text-neutral-500">
                        {book.subtitle || book.category || "Projet de livre"}
                      </p>
                    </div>
                  </div>

                  <div className="w-full md:w-auto shrink-0 flex items-center gap-2">
                    <button
                      onClick={() => handleOpenExportModal(book)}
                      className="bg-orange-50 hover:bg-orange-100 text-secondary text-xs font-bold px-3 py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                      title="Exporter / Télécharger le livre"
                    >
                      <span className="material-symbols-outlined text-base">download</span>
                      <span className="hidden sm:inline">Exporter</span>
                    </button>
                    <Link href={`/redaction?projectId=${book.id}`}>
                      <button className="w-full md:w-auto bg-secondary text-white text-xs font-bold px-5 py-2.5 rounded-xl hover:bg-orange-600 transition-colors flex items-center justify-center gap-1.5">
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
                <Link href="/projects">
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
                <Link href="/cover-studio">
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
                <Link href="/export">
                  <button className="w-full bg-neutral-50 hover:bg-neutral-100 text-neutral-900 text-xs font-bold py-2.5 rounded-xl border border-neutral-200 transition-colors">
                    Exporter un livre →
                  </button>
                </Link>
              </div>

            </div>
          </div>

        </main>
      </div>

      {/* EXPORT / DOWNLOAD MODAL */}
      <ExportBookModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        project={selectedProjectForExport}
      />
    </div>
  );
}
