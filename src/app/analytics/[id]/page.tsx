"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { useUser } from "@/hooks/useUser";
import { 
  BarChart3, 
  BookOpen, 
  FileText, 
  Coins, 
  Clock,
  ArrowLeft,
  List
} from "lucide-react";
import { countWordsInHtml, calculatePages, estimateReadingTime, estimateCost } from "@/lib/textAnalytics";

export default function ProjectAnalyticsPage({ params }: { params: { id: string } }) {
  const { displayName, displayEmail, signOut } = useUser();
  const userInitials = displayName ? displayName.substring(0, 2).toUpperCase() : "AU";
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const router = useRouter();
  const projectId = params.id;

  const [project, setProject] = useState<any>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Computed Stats
  const [totalWords, setTotalWords] = useState(0);
  const [chapterStats, setChapterStats] = useState<{title: string, words: number}[]>([]);

  useEffect(() => {
    async function fetchProjectData() {
      try {
        const res = await fetch(`/api/projects/${projectId}`);
        if (res.ok) {
          const data = await res.json();
          setProject(data.project);
          
          if (data.chapters) {
            setChapters(data.chapters);
            
            // Calculate words per chapter
            let total = 0;
            const stats = data.chapters.map((ch: any) => {
              const words = countWordsInHtml(ch.content);
              total += words;
              return { title: ch.title, words };
            });
            
            setTotalWords(total);
            setChapterStats(stats);
          }
        }
      } catch (err) {
        console.error("Erreur de chargement des détails du projet:", err);
      } finally {
        setLoading(false);
      }
    }
    
    if (projectId) {
      fetchProjectData();
    }
  }, [projectId]);

  // Derived metrics
  const totalPages = calculatePages(totalWords);
  const readingTime = estimateReadingTime(totalWords);
  const cost = estimateCost(totalWords);

  // Maximum words in a single chapter (for the bar chart scale)
  const maxWords = Math.max(...chapterStats.map(s => s.words), 1);

  return (
    <div className="min-h-screen bg-[#F9FAFB] font-body text-neutral-900 flex flex-col md:flex-row">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-10">
        <header className="bg-white/80 backdrop-blur-md sticky top-0 z-30 h-16 px-4 md:px-8 flex items-center justify-between gap-4 border-b border-neutral-100">
          <div className="flex items-center gap-3">
            <Link href="/analytics" className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-neutral-600 hover:text-neutral-900 bg-neutral-100 px-3 py-2 rounded-xl transition-all">
              <ArrowLeft className="w-4 h-4" />
              <span>Analytiques Globales</span>
            </Link>
            <h1 className="font-heading font-extrabold text-xl text-neutral-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-secondary" strokeWidth={2.5} />
              <span className="line-clamp-1">Statistiques: {project?.title || "Chargement..."}</span>
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

        <main className="p-4 sm:p-6 md:p-10 max-w-5xl mx-auto w-full space-y-8">
          
          {loading ? (
            <div className="flex flex-col justify-center items-center h-64 bg-white border border-neutral-200 rounded-3xl">
              <span className="material-symbols-outlined animate-spin text-secondary text-4xl">progress_activity</span>
              <p className="text-sm font-semibold text-neutral-500 mt-4">Analyse de votre manuscrit en cours...</p>
            </div>
          ) : !project ? (
            <div className="p-12 text-center text-neutral-500 bg-white rounded-3xl border border-neutral-200">
              <p className="font-bold text-neutral-800">Projet introuvable</p>
            </div>
          ) : (
            <>
              {/* Project Info Header */}
              <div className="bg-white p-8 rounded-3xl border border-neutral-200/80 shadow-2xs flex flex-col sm:flex-row items-center sm:items-start gap-6">
                {project.cover_url ? (
                  <div className="w-24 h-36 rounded-lg shadow-sm overflow-hidden shrink-0 bg-neutral-100 border border-neutral-200">
                    <img src={project.cover_url} alt="Cover" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-24 h-36 rounded-lg shadow-sm bg-neutral-100 border border-neutral-200 shrink-0 flex items-center justify-center">
                    <BookOpen className="w-10 h-10 text-neutral-300" />
                  </div>
                )}
                
                <div className="flex-1 text-center sm:text-left space-y-2">
                  <span className="inline-block bg-orange-50 text-secondary text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border border-orange-200">
                    {project.status || "En cours"}
                  </span>
                  <h2 className="text-3xl font-heading font-extrabold text-neutral-900">{project.title}</h2>
                  <p className="text-sm text-neutral-500">{project.subtitle}</p>
                  
                  <div className="pt-4 flex flex-wrap items-center justify-center sm:justify-start gap-4">
                    <Link href={`/redaction?projectId=${project.id}`}>
                      <button className="bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-xs flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">edit_document</span>
                        <span>Reprendre la rédaction</span>
                      </button>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Data Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-3xl border border-neutral-200/80 shadow-2xs text-center space-y-2">
                  <FileText className="w-6 h-6 text-blue-500 mx-auto mb-3" />
                  <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">Mots</span>
                  <p className="font-heading font-extrabold text-2xl text-neutral-900">{totalWords.toLocaleString('fr-FR')}</p>
                </div>
                
                <div className="bg-white p-6 rounded-3xl border border-neutral-200/80 shadow-2xs text-center space-y-2">
                  <BookOpen className="w-6 h-6 text-emerald-500 mx-auto mb-3" />
                  <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">Pages (KDP)</span>
                  <p className="font-heading font-extrabold text-2xl text-neutral-900">{totalPages}</p>
                </div>
                
                <div className="bg-white p-6 rounded-3xl border border-neutral-200/80 shadow-2xs text-center space-y-2">
                  <Clock className="w-6 h-6 text-purple-500 mx-auto mb-3" />
                  <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">Temps de lecture</span>
                  <p className="font-heading font-extrabold text-2xl text-neutral-900">{readingTime}</p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-neutral-200/80 shadow-2xs text-center space-y-2">
                  <Coins className="w-6 h-6 text-amber-500 mx-auto mb-3" />
                  <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">Coût estimé</span>
                  <p className="font-heading font-extrabold text-2xl text-neutral-900">{cost}</p>
                </div>
              </div>

              {/* Word Count Distribution Chart */}
              <div className="bg-white p-6 md:p-8 rounded-3xl border border-neutral-200/80 shadow-2xs space-y-6">
                <h3 className="font-heading font-extrabold text-xl text-neutral-900 flex items-center gap-2">
                  <List className="w-5 h-5 text-secondary" />
                  Répartition par Chapitre
                </h3>

                {chapterStats.length === 0 ? (
                  <p className="text-sm text-neutral-500 italic">Aucun chapitre créé pour l'instant.</p>
                ) : (
                  <div className="space-y-4">
                    {chapterStats.map((stat, idx) => {
                      const percentage = Math.max((stat.words / maxWords) * 100, 2); // Minimum 2% width for visibility
                      return (
                        <div key={idx} className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-neutral-800 line-clamp-1">{stat.title || `Chapitre ${idx + 1}`}</span>
                            <span className="text-neutral-500 font-medium">{stat.words.toLocaleString('fr-FR')} mots</span>
                          </div>
                          <div className="w-full bg-neutral-100 rounded-full h-3 overflow-hidden">
                            <div 
                              className="bg-secondary h-full rounded-full transition-all duration-1000 ease-out" 
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

        </main>
      </div>
    </div>
  );
}
