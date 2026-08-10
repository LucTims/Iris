"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { useUser } from "@/hooks/useUser";
import { Plus, Sparkles, BookOpen } from "lucide-react";

function CoverStudioHubContent() {
  const { displayName, displayEmail, signOut } = useUser();
  const userInitials = displayName ? displayName.substring(0, 2).toUpperCase() : "AU";
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchProjects = async () => {
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
    };
    fetchProjects();
  }, []);

  const filteredProjects = projects.filter((project) =>
    (project.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (project.subtitle || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F9FAFB] font-body text-neutral-900 flex flex-col md:flex-row">
      {/* GLOBAL REUSABLE SIDEBAR */}
      <Sidebar />

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-10">
        <header className="bg-white/80 backdrop-blur-md sticky top-0 z-30 h-16 px-4 md:px-8 flex items-center justify-between gap-4 border-b border-neutral-100">
          <div className="flex items-center gap-3">
            <h1 className="font-heading font-extrabold text-xl text-neutral-900 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-secondary" strokeWidth={2} />
              <span>Studio de Couverture</span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="w-9 h-9 rounded-full bg-orange-100 border border-orange-300 flex items-center justify-center text-secondary font-extrabold font-heading text-sm cursor-pointer hover:ring-2 hover:ring-orange-300 transition-all"
              >
                {userInitials}
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-neutral-200 py-2 z-50">
                  <div className="px-4 py-3 border-b border-neutral-100">
                    <p className="font-heading font-bold text-sm text-neutral-900">{displayName}</p>
                    <p className="text-xs text-neutral-500 truncate">{displayEmail}</p>
                  </div>
                  <div className="py-1">
                    <Link href="/dashboard" className="flex items-center gap-3 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50">
                      <span className="material-symbols-outlined text-base text-neutral-400">dashboard</span>
                      <span>Tableau de bord</span>
                    </Link>
                    <Link href="/settings" className="flex items-center gap-3 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50">
                      <span className="material-symbols-outlined text-base text-neutral-400">settings</span>
                      <span>Paramètres</span>
                    </Link>
                  </div>
                  <div className="pt-1 border-t border-neutral-100">
                    <button onClick={signOut} className="w-full text-left flex items-center gap-3 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50">
                      <span className="material-symbols-outlined text-base text-red-500">logout</span>
                      <span>Se déconnecter</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6 md:p-10 max-w-7xl mx-auto w-full space-y-8">
          
          {/* Hero Section */}
          <div className="bg-white p-8 md:p-10 rounded-3xl border border-neutral-200/80 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
            
            <div className="relative z-10 max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 border border-orange-200 text-secondary text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" /> Intelligence Artificielle
              </div>
              <h2 className="text-3xl md:text-4xl font-heading font-extrabold text-neutral-900">
                Donnez vie à vos livres avec des couvertures professionnelles.
              </h2>
              <p className="text-neutral-600 font-medium text-sm md:text-base leading-relaxed">
                Le Studio de Couverture IA génère des designs uniques et de haute qualité pour vos projets. Sélectionnez l'un de vos livres ci-dessous pour personnaliser sa couverture en quelques clics.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="font-heading font-extrabold text-xl text-neutral-900">
                Vos Livres & Projets
              </h3>
              
              <div className="relative w-full sm:w-72">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-lg">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Rechercher un livre..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-neutral-200 rounded-xl text-sm focus:border-secondary outline-none transition-colors"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col justify-center items-center h-48 bg-white border border-neutral-200 rounded-3xl">
                <span className="material-symbols-outlined animate-spin text-secondary text-3xl">progress_activity</span>
                <p className="text-sm font-semibold text-neutral-500 mt-3">Chargement de vos projets...</p>
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 bg-white border border-neutral-200 rounded-3xl text-center">
                <div className="w-16 h-16 bg-neutral-50 rounded-2xl flex items-center justify-center mb-4">
                  <BookOpen className="w-8 h-8 text-neutral-400" strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-bold text-neutral-900 mb-2">Aucun projet trouvé</h3>
                <p className="text-sm text-neutral-500 max-w-sm mb-6">
                  {searchQuery ? "Aucun livre ne correspond à votre recherche." : "Vous n'avez pas encore de livre. Allez dans 'Mes Livres & Projets' pour en créer un."}
                </p>
                {!searchQuery && (
                  <Link href="/projects" className="inline-flex items-center gap-2 bg-neutral-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-neutral-800 transition-colors">
                    <Plus className="w-4 h-4" /> Créer un projet
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProjects.map((project) => (
                  <div key={project.id} className="bg-white border border-neutral-200 hover:border-secondary/50 rounded-3xl overflow-hidden shadow-xs hover:shadow-md transition-all group flex flex-col h-full">
                    {/* Fake Cover Preview Area */}
                    <div className="aspect-[4/3] bg-neutral-100 flex items-center justify-center relative overflow-hidden p-6">
                      {project.cover_url ? (
                        <div className="relative w-full h-full rounded-lg shadow-sm overflow-hidden flex items-center justify-center bg-white border border-neutral-200/50">
                          <img src={project.cover_url} alt="Couverture" className="max-h-full object-contain" />
                        </div>
                      ) : (
                        <div className="w-24 h-32 bg-white rounded shadow-sm border border-neutral-200 flex flex-col items-center justify-center gap-2 group-hover:scale-105 transition-transform">
                          <BookOpen className="w-6 h-6 text-neutral-300" strokeWidth={1.5} />
                          <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest text-center px-2">Sans Couverture</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="p-5 flex flex-col flex-1">
                      <div className="flex-1">
                        <h4 className="font-bold text-neutral-900 line-clamp-1">{project.title}</h4>
                        <p className="text-xs text-neutral-500 line-clamp-1 mt-1">{project.subtitle || "Sans sous-titre"}</p>
                      </div>
                      
                      <Link 
                        href={`/cover-studio/${project.id}`}
                        className="mt-5 w-full bg-secondary/10 hover:bg-secondary/20 text-secondary font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>Modifier la couverture</span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function CoverStudioHubPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center"><span className="material-symbols-outlined animate-spin text-secondary text-3xl">progress_activity</span></div>}>
      <CoverStudioHubContent />
    </Suspense>
  );
}
