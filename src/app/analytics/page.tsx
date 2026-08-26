"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import { useUser } from "@/hooks/useUser";
import { 
  BarChart3, 
  BookOpen, 
  FileText, 
  Coins, 
  TrendingUp,
  ChevronRight
} from "lucide-react";

export default function AnalyticsHubPage() {
  const { displayName, displayEmail, signOut } = useUser();
  const userInitials = displayName ? displayName.substring(0, 2).toUpperCase() : "AU";
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  
  const [projects, setProjects] = useState<any[]>([]);
  const [globalStats, setGlobalStats] = useState<any>(null);
  const [projectStats, setProjectStats] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const [projRes, statsRes] = await Promise.all([
          fetch("/api/projects"),
          fetch("/api/analytics")
        ]);

        if (projRes.ok) {
          const projData = await projRes.json();
          setProjects(projData.projects || []);
        }

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setGlobalStats(statsData.global);
          setProjectStats(statsData.projectStats || {});
        }
      } catch (err) {
        console.error("Erreur de chargement analytiques:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredProjects = projects.filter((project) =>
    (project.title || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppLayout>
        <main className="p-4 sm:p-6 md:p-10 max-w-7xl mx-auto w-full space-y-8">
          
          {/* Global Stats Overview */}
          <div>
            <h2 className="font-heading font-extrabold text-xl text-neutral-900 mb-6 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-neutral-400" />
              Vue d'Ensemble
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-3xl border border-neutral-200/80 shadow-2xs space-y-3 relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 w-20 h-20 bg-orange-50 rounded-full group-hover:scale-150 transition-transform duration-500 z-0"></div>
                <div className="relative z-10">
                  <div className="w-10 h-10 bg-orange-100 text-secondary rounded-xl flex items-center justify-center mb-4">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">Total Projets</span>
                  <p className="font-heading font-extrabold text-3xl text-neutral-900 mt-1">{loading ? "-" : projects.length}</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-neutral-200/80 shadow-2xs space-y-3 relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 w-20 h-20 bg-blue-50 rounded-full group-hover:scale-150 transition-transform duration-500 z-0"></div>
                <div className="relative z-10">
                  <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-4">
                    <FileText className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">Mots Rédigés</span>
                  <p className="font-heading font-extrabold text-3xl text-neutral-900 mt-1">{loading ? "-" : globalStats?.totalWords?.toLocaleString('fr-FR') || 0}</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-neutral-200/80 shadow-2xs space-y-3 relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 w-20 h-20 bg-emerald-50 rounded-full group-hover:scale-150 transition-transform duration-500 z-0"></div>
                <div className="relative z-10">
                  <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined">menu_book</span>
                  </div>
                  <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">Pages Estimées</span>
                  <p className="font-heading font-extrabold text-3xl text-neutral-900 mt-1">{loading ? "-" : globalStats?.totalPages?.toLocaleString('fr-FR') || 0}</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-neutral-200/80 shadow-2xs space-y-3 relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 w-20 h-20 bg-purple-50 rounded-full group-hover:scale-150 transition-transform duration-500 z-0"></div>
                <div className="relative z-10">
                  <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-4">
                    <Coins className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">Pièces dépensées</span>
                  <p className="font-heading font-extrabold text-3xl text-neutral-900 mt-1">{loading ? "-" : (globalStats?.totalCoins || 0).toLocaleString('fr-FR')} <span className="text-lg">🪙</span></p>
                </div>
              </div>
            </div>
          </div>

          {/* Project List */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="font-heading font-extrabold text-xl text-neutral-900">
                Statistiques par Projet
              </h2>
              
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

            <div className="bg-white rounded-3xl border border-neutral-200/80 shadow-2xs overflow-hidden">
              {loading ? (
                <div className="flex flex-col justify-center items-center h-48">
                  <span className="material-symbols-outlined animate-spin text-secondary text-3xl">progress_activity</span>
                  <p className="text-sm font-semibold text-neutral-500 mt-3">Calcul de vos statistiques...</p>
                </div>
              ) : filteredProjects.length === 0 ? (
                <div className="p-12 text-center text-neutral-500">
                  <div className="w-16 h-16 bg-neutral-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <BarChart3 className="w-8 h-8 text-neutral-400" />
                  </div>
                  <p className="font-bold text-neutral-800">Aucun projet trouvé</p>
                </div>
              ) : (
                <div className="divide-y divide-neutral-100">
                  {filteredProjects.map((project) => {
                    const stats = projectStats[project.id] || { words: 0, chaptersCount: 0, coins: 0 };
                    const pages = Math.ceil(stats.words / 250);
                    const coins = (stats as any).coins || 0;
                    
                    return (
                      <div key={project.id} className="p-6 hover:bg-neutral-50/50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-6 group">
                        
                        <div className="flex items-center gap-4 flex-1">
                          {project.cover_url ? (
                            <div className="w-14 h-20 rounded shadow-sm overflow-hidden shrink-0 bg-neutral-100 border border-neutral-200">
                              <img src={project.cover_url} alt="Cover" className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="w-14 h-20 rounded shadow-sm bg-neutral-100 border border-neutral-200 shrink-0 flex items-center justify-center">
                              <BookOpen className="w-6 h-6 text-neutral-300" />
                            </div>
                          )}
                          
                          <div>
                            <h3 className="font-heading font-bold text-base text-neutral-900 group-hover:text-secondary transition-colors line-clamp-1">{project.title}</h3>
                            <p className="text-xs text-neutral-500 mt-1">{stats.chaptersCount} chapitre(s) • Dernière modif. {new Date(project.updated_at).toLocaleDateString('fr-FR')}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-8 px-4 py-3 bg-white border border-neutral-100 rounded-2xl md:bg-transparent md:border-transparent md:p-0">
                          <div className="text-center">
                            <span className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Mots</span>
                            <span className="font-bold text-neutral-800">{stats.words.toLocaleString('fr-FR')}</span>
                          </div>
                          <div className="w-px h-8 bg-neutral-200"></div>
                          <div className="text-center">
                            <span className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Pages</span>
                            <span className="font-bold text-neutral-800">{pages}</span>
                          </div>
                          <div className="w-px h-8 bg-neutral-200"></div>
                          <div className="text-center">
                            <span className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Pièces</span>
                            <span className="font-bold text-amber-600">{coins.toLocaleString('fr-FR')}</span>
                          </div>
                        </div>

                        <Link href={`/analytics/${project.id}`} className="shrink-0">
                          <button className="w-full md:w-auto bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-xs flex items-center justify-center gap-2">
                            <span>Voir détails</span>
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </main>
    </AppLayout>
  );
}
