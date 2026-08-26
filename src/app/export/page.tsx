"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import { useUser } from "@/hooks/useUser";
import { Plus, LayoutTemplate, BookOpen, Settings2 } from "lucide-react";

function ExportHubContent() {
  const { } = useUser();
  
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
    <AppLayout>
      <main className="p-4 sm:p-6 md:p-10 max-w-7xl mx-auto w-full space-y-8">
        
        {/* Header Section Compact */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-heading font-extrabold text-neutral-900 flex items-center gap-2">
              <Settings2 className="w-7 h-7 text-secondary" strokeWidth={2.5} />
              Studio Mise en page & KDP
            </h1>
            <p className="text-sm text-neutral-500 mt-2 max-w-xl">
              Préparez votre livre pour l'impression ou les liseuses. Ajustez les marges, choisissez vos polices et ajoutez des lettrines.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="font-heading font-extrabold text-lg text-neutral-900">
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
                    {/* Cover Preview Area */}
                    <div className="aspect-[4/3] bg-neutral-100 flex items-center justify-center relative overflow-hidden p-6">
                      {project.cover_url ? (
                        <div className="relative w-full h-full rounded-lg shadow-sm overflow-hidden flex items-center justify-center bg-white border border-neutral-200/50">
                          <img src={project.cover_url} alt="Couverture" className="max-h-full object-contain" />
                        </div>
                      ) : (
                        <div className="w-24 h-32 bg-white rounded shadow-sm border border-neutral-200 flex flex-col items-center justify-center gap-2 group-hover:scale-105 transition-transform">
                          <BookOpen className="w-6 h-6 text-neutral-300" strokeWidth={1.5} />
                          <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest text-center px-2">Format Standard</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="p-5 flex flex-col flex-1">
                      <div className="flex-1">
                        <h4 className="font-bold text-neutral-900 line-clamp-1">{project.title}</h4>
                        <p className="text-xs text-neutral-500 line-clamp-1 mt-1">{project.subtitle || "Sans sous-titre"}</p>
                      </div>
                      
                      <Link 
                        href={`/export/${project.id}`}
                        className="mt-5 w-full bg-secondary/10 hover:bg-secondary/20 text-secondary font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors"
                      >
                        <LayoutTemplate className="w-4 h-4" />
                        <span>Mise en page & KDP</span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
      </main>
    </AppLayout>
  );
}

export default function ExportHubPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center"><span className="material-symbols-outlined animate-spin text-secondary text-3xl">progress_activity</span></div>}>
      <ExportHubContent />
    </Suspense>
  );
}
