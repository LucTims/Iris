"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import { useProjects } from "@/hooks/useProjects";

/**
 * Avancement affiché d'un livre.
 *
 * L'API renvoie désormais un rapport `completion` calculé sur le contenu RÉEL
 * des chapitres (voir `@/lib/book/completion`). On l'utilise tel quel.
 *
 * L'ancienne version estimait le pourcentage à partir d'un nombre de chapitres
 * « attendu » deviné depuis le libellé de longueur (5, 15 ou 30), puis le
 * bornait à 85 % : un livre entièrement rédigé ne dépassait jamais 85 %, et un
 * livre de 6 chapitres tous écrits affichait 40 %. Le résultat n'était de
 * toute façon pas branché — la barre était codée en dur à 50 %.
 */
function getProjectProgress(book: any) {
  const completion = book.completion as
    | { percent: number; written: number; total: number; isComplete: boolean }
    | undefined;

  const status = book.status || "En rédaction";
  const isComplete = status === "Terminé" || completion?.isComplete === true;

  const percent = isComplete ? 100 : Math.max(0, Math.min(100, completion?.percent ?? 0));

  if (isComplete) {
    return {
      logicalStatus: "Terminé",
      percent: 100,
      written: completion?.written ?? 0,
      total: completion?.total ?? 0,
      colorClass: "bg-emerald-500",
      textClass: "text-emerald-600",
      bgClass: "bg-emerald-100/90 border-emerald-200/50 text-emerald-700",
    };
  }

  const logicalStatus = percent === 0 ? "Brouillon" : "En rédaction";

  return {
    logicalStatus,
    percent,
    written: completion?.written ?? 0,
    total: completion?.total ?? 0,
    colorClass: "bg-secondary",
    textClass: "text-secondary",
    bgClass: "bg-orange-100/90 border-orange-200/50 text-secondary",
  };
}
import { useUser } from "@/hooks/useUser";

const ExportBookModal = dynamic(() => import("@/components/ExportBookModal"), { ssr: false });

export default function ProjectsPage() {
  const { displayName, displayEmail, signOut } = useUser();
  const userInitials = displayName ? displayName.substring(0, 2).toUpperCase() : "AU";
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("Tous");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [selectedProjectForExport, setSelectedProjectForExport] = useState<any | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { projects, isLoading: loading, mutate: fetchProjects } = useProjects();

  // `activeFilter` existait déjà mais n'était branché nulle part : la liste
  // ignorait purement et simplement le filtre choisi. Il pilote désormais un
  // vrai tri par état d'avancement.
  const filteredProjects = projects.filter((project: any) => {
    const needle = searchQuery.toLowerCase();
    const matchesSearch =
      (project.title || "").toLowerCase().includes(needle) ||
      (project.subtitle || "").toLowerCase().includes(needle) ||
      (project.category || "").toLowerCase().includes(needle);

    if (!matchesSearch) return false;
    if (activeFilter === "Tous") return true;

    const { logicalStatus } = getProjectProgress(project);
    return logicalStatus === activeFilter;
  });

  const finishedCount = projects.filter(
    (p: any) => getProjectProgress(p).logicalStatus === "Terminé"
  ).length;

  const handleDeleteBook = (id: string) => {
    setProjectToDelete(id);
  };

  const confirmDeleteBook = async () => {
    if (!projectToDelete) return;
    const id = projectToDelete;
    
    // Optimistic UI update via SWR
    const previousProjects = projects;
    fetchProjects({ projects: previousProjects.filter((p: any) => p.id !== id) }, false);
    
    setProjectToDelete(null); // Close modal immediately
    setIsDeleting(true);
    
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "DELETE"
      });
      if (!res.ok) {
        console.error("Erreur côté serveur lors de la suppression");
      }
    } catch (err) {
      console.error("Erreur de suppression:", err);
    } finally {
      setIsDeleting(false);
      fetchProjects(); // Revalidate with server
    }
  };

  const handleDuplicateBook = async (project: any) => {
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${project.title} (Copie)`,
          subtitle: project.subtitle,
          category: project.category
        })
      });
      if (res.ok) {
        fetchProjects();
      }
    } catch (err) {
      console.error("Erreur de duplication:", err);
    }
  };

  const handleOpenExportModal = (project: any) => {
    setSelectedProjectForExport(project);
    setIsExportModalOpen(true);
  };

  return (
    <AppLayout>
        {/* Content Container */}
        <main className="p-4 sm:p-6 md:p-10 max-w-6xl mx-auto w-full space-y-6">
          {/* Controls Bar: Search & Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-2xs">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 text-lg">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher par titre, sujet ou catégorie..."
                className="w-full bg-neutral-100/80 border border-transparent rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-neutral-800 focus:bg-white focus:border-neutral-300 outline-none transition-all"
              />
            </div>

            {/* Filtre par état d'avancement */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {[
                { key: "Tous", label: `Tous (${projects.length})` },
                { key: "En rédaction", label: "En rédaction" },
                { key: "Terminé", label: `Terminés (${finishedCount})` },
              ].map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => setActiveFilter(chip.key)}
                  aria-pressed={activeFilter === chip.key}
                  className={`shrink-0 text-[11px] font-bold px-3 py-1.5 rounded-full border transition-all ${
                    activeFilter === chip.key
                      ? "bg-[#C84B31] text-white border-[#C84B31]"
                      : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300"
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Grid/List View Toggle & New Book Button */}
            <div className="flex items-center justify-between sm:justify-end gap-3">
              <Link href="/projects/new">
                <button className="bg-[#C84B31] hover:bg-[#B83E26] text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-2xs hover:shadow-xs flex items-center gap-1.5 cursor-pointer">
                  <span className="material-symbols-outlined text-base">add</span>
                  <span>Nouveau Livre</span>
                </button>
              </Link>

              <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-lg transition-all ${
                    viewMode === "grid" ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-2xs" : "text-neutral-400 hover:text-neutral-700 dark:text-neutral-300"
                  }`}
                  title="Vue Grille"
                >
                  <span className="material-symbols-outlined text-lg">grid_view</span>
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded-lg transition-all ${
                    viewMode === "list" ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-2xs" : "text-neutral-400 hover:text-neutral-700 dark:text-neutral-300"
                  }`}
                  title="Vue Liste"
                >
                  <span className="material-symbols-outlined text-lg">view_list</span>
                </button>
              </div>
            </div>
          </div>

          {/* Projects Display */}
          {filteredProjects.length === 0 ? (
            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 p-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-orange-50 border border-orange-200 flex items-center justify-center text-secondary mx-auto">
                <span className="material-symbols-outlined text-3xl">menu_book</span>
              </div>
              <h3 className="font-heading font-extrabold text-xl text-neutral-900 dark:text-neutral-100">Aucun projet trouvé</h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
                Aucun livre ne correspond à vos critères de recherche. Essayez de modifier vos filtres ou créez un nouveau livre dès maintenant.
              </p>
              <Link href="/projects/new">
                <button
                  className="bg-[#C84B31] hover:bg-[#B83E26] text-white font-bold text-xs px-5 py-3 rounded-xl transition-all inline-flex items-center gap-2 shadow-2xs hover:shadow-xs cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">add</span>
                  <span>Créer un nouveau livre</span>
                </button>
              </Link>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredProjects.map((book) => {
                  const progress = getProjectProgress(book);
                  return (
                  <div
                    key={book.id}
                  className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 hover:border-orange-300 transition-all shadow-2xs hover:shadow-md flex flex-col overflow-hidden group"
                >
                  {/* Book Cover Thumbnail Header (Mockup Style) */}
                  <div className="h-60 bg-gradient-to-b from-neutral-50 to-neutral-100/50 relative flex items-center justify-center border-b border-neutral-100 dark:border-neutral-800 overflow-hidden">
                    <div className="relative w-[110px] h-[160px] sm:w-[130px] sm:h-[190px] group-hover:-translate-y-2 group-hover:scale-105 transition-all duration-500 ease-out mt-4 mb-2">
                      {/* Book Shadow */}
                      <div className="absolute -bottom-3 left-4 right-0 h-6 bg-black/30 blur-xl rounded-full group-hover:blur-2xl transition-all duration-500"></div>
                      
                      {/* Pages Edge (Right) */}
                      <div className="absolute top-[1.5%] bottom-[1.5%] right-[-6px] w-[6px] bg-[#f4f4f5] border-y border-r border-neutral-300 rounded-r-sm z-0 shadow-[inset_-1px_0_2px_rgba(0,0,0,0.05)] flex">
                        <div className="w-[1px] h-full bg-neutral-300 ml-auto mr-[1px] opacity-60"></div>
                        <div className="w-[1px] h-full bg-neutral-300 mr-[1px] opacity-60"></div>
                      </div>
                      
                      {/* Cover Image Container */}
                      <div className="relative w-full h-full rounded-r-md rounded-l-[3px] overflow-hidden border border-black/10 shadow-[2px_2px_8px_rgba(0,0,0,0.15)] z-10 bg-white dark:bg-neutral-900">
                        <img
                          src={book.cover_url || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=600&auto=format&fit=crop"}
                          alt={book.title}
                          className="w-full h-full object-cover"
                        />
                        {/* Hinge / Spine Gradient Overlay */}
                        <div className="absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-black/30 via-black/5 to-transparent mix-blend-multiply"></div>
                        <div className="absolute inset-y-0 left-[1px] w-[1px] bg-white dark:bg-neutral-900/40"></div>
                      </div>
                    </div>
                    
                    <span className="absolute top-4 left-4 bg-white dark:bg-neutral-900/90 backdrop-blur-md border border-neutral-200/50 px-2.5 py-1 rounded-full text-[9px] font-extrabold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider shadow-2xs z-20">
                      {book.category}
                    </span>
                    <span className={`absolute top-4 right-4 backdrop-blur-md border px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-wider shadow-2xs z-20 inline-flex items-center gap-1 ${progress.bgClass}`}>
                      {progress.logicalStatus === "Terminé" && (
                        <span className="material-symbols-outlined text-[11px] leading-none">check_circle</span>
                      )}
                      {progress.logicalStatus === "Terminé" ? "Livre terminé" : progress.logicalStatus}
                    </span>
                  </div>

                  {/* Body Info */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-1.5">
                      <h3 className="font-heading font-extrabold text-lg text-neutral-900 dark:text-neutral-100 group-hover:text-secondary transition-colors line-clamp-1">
                        {book.title}
                      </h3>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 font-medium">
                        {book.subtitle}
                      </p>
                    </div>

                    {/* Progress Bar (Masquée ou adaptée) */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                        <span>Progression</span>
                        <span className={`font-bold ${progress.textClass}`}>{progress.percent}%</span>
                      </div>
                      <div className="w-full h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${progress.colorClass}`}
                          style={{ width: `${progress.percent}%` }}
                        ></div>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono pt-1">
                        <span>
                          {progress.total > 0
                            ? `${progress.written}/${progress.total} chapitres rédigés`
                            : `${book.chapters?.[0]?.count || 0} chapitres`}
                        </span>
                        <span>{new Date(book.updated_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-2">
                      <Link
                        href={`/redaction?projectId=${book.id}`}
                        className="flex-1 bg-[#C84B31] hover:bg-[#B83E26] text-white text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-2xs hover:shadow-xs"
                      >
                        <span className="material-symbols-outlined text-base">edit_note</span>
                        <span>Ouvrir Studio</span>
                      </Link>

                      <button
                        onClick={() => handleOpenExportModal(book)}
                        className="p-2.5 rounded-xl bg-orange-50 text-secondary hover:bg-orange-100 transition-colors flex items-center justify-center"
                        title="Exporter / Télécharger le livre (EPUB, PDF, Word...)"
                      >
                        <span className="material-symbols-outlined text-base">download</span>
                      </button>

                      <Link
                        href={`/cover-studio?projectId=${book.id}`}
                        className="p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 transition-colors flex items-center justify-center"
                        title="Créer une couverture"
                      >
                        <span className="material-symbols-outlined text-base">palette</span>
                      </Link>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDuplicateBook(book)}
                          className="p-2 rounded-xl text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:bg-neutral-800 hover:text-neutral-900 dark:text-neutral-100 transition-colors"
                          title="Dupliquer"
                        >
                          <span className="material-symbols-outlined text-lg">content_copy</span>
                        </button>
                        <button
                          onClick={() => handleDeleteBook(book.id)}
                          className="p-2 rounded-xl text-neutral-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                          title="Supprimer"
                        >
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ); })}
            </div>
          ) : (
            /* List View (Table Format matching BoomBooks typography) */
            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 overflow-hidden">
              
              {/* Table Header */}
              <div className="hidden sm:grid grid-cols-12 gap-4 px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50">
                <div className="col-span-1 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Ordre</div>
                <div className="col-span-6 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Titre</div>
                <div className="col-span-3 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Auteur</div>
                <div className="col-span-2 text-[10px] font-bold text-neutral-400 uppercase tracking-widest text-right">Statut</div>
              </div>

              <div className="divide-y divide-neutral-100">
              {filteredProjects.map((book, index) => (
                <div key={book.id} className="p-4 sm:p-5 flex flex-col sm:grid sm:grid-cols-12 items-start sm:items-center gap-4 hover:bg-neutral-50/80 transition-colors">
                  
                  {/* Ordre */}
                  <div className="hidden sm:flex col-span-1 flex-col items-center justify-center gap-0.5 bg-neutral-100/50 w-8 py-1 rounded-lg">
                    <span className="material-symbols-outlined text-[10px] text-neutral-400 hover:text-neutral-700 dark:text-neutral-300 cursor-pointer">expand_less</span>
                    <span className="material-symbols-outlined text-[10px] text-neutral-400 hover:text-neutral-700 dark:text-neutral-300 cursor-pointer">expand_more</span>
                  </div>

                  {/* Titre */}
                  <div className="col-span-6 flex items-center gap-4 min-w-0">
                    <div className="w-14 h-10 sm:w-16 sm:h-12 rounded-lg bg-neutral-200 overflow-hidden shrink-0 border border-neutral-200 dark:border-neutral-800 shadow-2xs">
                      <img src={book.cover_url || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=600&auto=format&fit=crop"} alt={book.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <h3 className="font-heading font-extrabold text-sm text-neutral-900 dark:text-neutral-100 truncate">
                        {book.title}
                      </h3>
                      <p className="text-[11px] font-bold text-emerald-600 truncate">{book.chapters?.[0]?.count || 0} chapitres</p>
                    </div>
                  </div>

                  {/* Auteur */}
                  <div className="col-span-3 text-xs font-semibold text-neutral-500 dark:text-neutral-400 truncate">
                    {displayName || "Auteur"}
                  </div>

                  {/* Statut & Actions */}
                  <div className="col-span-2 flex items-center justify-end gap-2">
                    <span className="bg-orange-50 text-secondary text-[11px] font-bold px-3 py-1 rounded-full shrink-0">
                      {book.status}
                    </span>

                    <button
                      onClick={() => handleOpenExportModal(book)}
                      className="p-1.5 rounded-lg bg-orange-50 text-secondary hover:bg-orange-100 transition-colors hidden sm:flex items-center justify-center"
                      title="Exporter / Télécharger"
                    >
                      <span className="material-symbols-outlined text-base">download</span>
                    </button>
                  </div>
                  
                  {/* Mobile Only Actions */}
                  <div className="flex sm:hidden items-center gap-3 w-full justify-end border-t pt-3 mt-2">
                    <Link
                      href={`/redaction?projectId=${book.id}`}
                      className="bg-[#C84B31] hover:bg-[#B83E26] text-white text-xs font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-2xs hover:shadow-xs"
                    >
                      <span className="material-symbols-outlined text-base">edit_note</span>
                      <span>Studio</span>
                    </Link>

                    <button
                      onClick={() => handleOpenExportModal(book)}
                      className="bg-orange-50 hover:bg-orange-100 text-secondary text-xs font-bold px-3 py-2 rounded-xl transition-all flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-base">download</span>
                      <span>Exporter</span>
                    </button>

                    <Link
                      href={`/cover-studio?projectId=${book.id}`}
                      className="bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-800 dark:text-neutral-200 text-xs font-bold px-3 py-2 rounded-xl transition-all flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-base">palette</span>
                      <span className="hidden lg:inline">Couverture</span>
                    </Link>

                    <button
                      onClick={() => handleDeleteBook(book.id)}
                      className="p-2 text-neutral-400 hover:text-red-600 rounded-xl hover:bg-red-50"
                    >
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                  </div>
                </div>
              ))}
              </div>
            </div>
          )}
        </main>



      {/* EXPORT / DOWNLOAD MODAL */}
      <ExportBookModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        project={selectedProjectForExport}
      />

      {/* DELETE CONFIRMATION MODAL */}
      {projectToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl scale-100 animate-slideUp">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-red-600 text-2xl">delete</span>
            </div>
            <h3 className="text-xl font-bold text-center text-neutral-900 dark:text-neutral-100 mb-2">Supprimer le projet ?</h3>
            <p className="text-center text-sm text-neutral-500 dark:text-neutral-400 mb-6">
              Cette action est irréversible. Toutes les données de ce livre seront définitivement perdues.
            </p>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setProjectToDelete(null)}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 transition-colors"
              >
                Annuler
              </button>
              <button 
                onClick={confirmDeleteBook}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
