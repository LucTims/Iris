"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import { useProjects } from "@/hooks/useProjects";
import { estimateChapterCoins } from "@/lib/ai/pricing";

function getProjectProgress(book: any) {
  let logicalStatus = book.status || "En rédaction";
  if (logicalStatus === "En cours" || logicalStatus === "Brouillon") logicalStatus = "En rédaction";
  
  const count = book.chapters?.[0]?.count || 0;
  let expected = 15;
  if (book.length?.includes("Court")) expected = 5;
  if (book.length?.includes("Long")) expected = 30;

  let percent = 0;
  let colorClass = "bg-secondary";
  let textClass = "text-secondary";
  let bgClass = "bg-orange-100/90 border-orange-200/50";

  if (logicalStatus === "En rédaction") {
    const rawPercent = count === 0 ? 5 : Math.round((count / expected) * 100);
    percent = Math.min(85, Math.max(5, rawPercent));
  } else if (logicalStatus === "Mise en page") {
    percent = 90;
    colorClass = "bg-amber-500";
    textClass = "text-amber-600";
    bgClass = "bg-amber-100/90 border-amber-200/50";
  } else if (logicalStatus === "Terminé") {
    percent = 100;
    colorClass = "bg-emerald-500";
    textClass = "text-emerald-600";
    bgClass = "bg-emerald-100/90 border-emerald-200/50";
  }

  return { logicalStatus, percent, colorClass, textClass, bgClass };
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
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [selectedProjectForExport, setSelectedProjectForExport] = useState<any | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // New book form state
  const [newTitle, setNewTitle] = useState("");
  const [newSubtitle, setNewSubtitle] = useState("");
  const [newCategory, setNewCategory] = useState("Business & Entrepreneuriat");
  const [newLength, setNewLength] = useState("Moyen (~70 pages)");

  const { projects, isLoading: loading, mutate: fetchProjects } = useProjects();

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      (project.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (project.subtitle || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (project.category || "").toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  const handleCreateBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          subtitle: newSubtitle || "Nouveau projet de livre",
          category: newCategory,
          length: newLength
        })
      });

      if (res.ok) {
        fetchProjects();
        setNewTitle("");
        setNewSubtitle("");
        setIsCreateModalOpen(false);
      }
    } catch (err) {
      console.error("Erreur de création de projet:", err);
    }
  };

  const handleDeleteBook = (id: string) => {
    setProjectToDelete(id);
  };

  const confirmDeleteBook = async () => {
    if (!projectToDelete) return;
    setIsDeleting(true);
    const id = projectToDelete;
    
    // Optimistic UI update
    setProjects(prev => prev.filter(p => p.id !== id));
    setProjectToDelete(null); // Close modal immediately
    setIsDeleting(false);
    
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "DELETE"
      });
      if (!res.ok) {
        // If it fails, we should ideally fetch projects again, but for now just log it
        console.error("Erreur côté serveur lors de la suppression");
      }
    } catch (err) {
      console.error("Erreur de suppression:", err);
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
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-2xs">
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

            {/* Grid/List View Toggle */}
            <div className="flex items-center justify-between sm:justify-end gap-3">

              <div className="flex items-center bg-neutral-100 p-1 rounded-xl">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-lg transition-all ${
                    viewMode === "grid" ? "bg-white text-neutral-900 shadow-2xs" : "text-neutral-400 hover:text-neutral-700"
                  }`}
                  title="Vue Grille"
                >
                  <span className="material-symbols-outlined text-lg">grid_view</span>
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded-lg transition-all ${
                    viewMode === "list" ? "bg-white text-neutral-900 shadow-2xs" : "text-neutral-400 hover:text-neutral-700"
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
            <div className="bg-white rounded-2xl border border-neutral-200/80 p-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-orange-50 border border-orange-200 flex items-center justify-center text-secondary mx-auto">
                <span className="material-symbols-outlined text-3xl">menu_book</span>
              </div>
              <h3 className="font-heading font-extrabold text-xl text-neutral-900">Aucun projet trouvé</h3>
              <p className="text-sm text-neutral-500 max-w-sm mx-auto">
                Aucun livre ne correspond à vos critères de recherche. Essayez de modifier vos filtres ou créez un nouveau livre dès maintenant.
              </p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-secondary text-white font-bold text-xs px-5 py-3 rounded-xl hover:bg-orange-600 transition-all inline-flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-base">add</span>
                <span>Créer un nouveau livre</span>
              </button>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((book) => {
                  const progress = getProjectProgress(book);
                  return (
                  <div
                    key={book.id}
                  className="bg-white rounded-2xl border border-neutral-200/80 hover:border-orange-300 transition-all shadow-2xs hover:shadow-md flex flex-col overflow-hidden group"
                >
                  {/* Book Cover Thumbnail Header (Mockup Style) */}
                  <div className="h-60 bg-gradient-to-b from-neutral-50 to-neutral-100/50 relative flex items-center justify-center border-b border-neutral-100 overflow-hidden">
                    <div className="relative w-[110px] h-[160px] sm:w-[130px] sm:h-[190px] group-hover:-translate-y-2 group-hover:scale-105 transition-all duration-500 ease-out mt-4 mb-2">
                      {/* Book Shadow */}
                      <div className="absolute -bottom-3 left-4 right-0 h-6 bg-black/30 blur-xl rounded-full group-hover:blur-2xl transition-all duration-500"></div>
                      
                      {/* Pages Edge (Right) */}
                      <div className="absolute top-[1.5%] bottom-[1.5%] right-[-6px] w-[6px] bg-[#f4f4f5] border-y border-r border-neutral-300 rounded-r-sm z-0 shadow-[inset_-1px_0_2px_rgba(0,0,0,0.05)] flex">
                        <div className="w-[1px] h-full bg-neutral-300 ml-auto mr-[1px] opacity-60"></div>
                        <div className="w-[1px] h-full bg-neutral-300 mr-[1px] opacity-60"></div>
                      </div>
                      
                      {/* Cover Image Container */}
                      <div className="relative w-full h-full rounded-r-md rounded-l-[3px] overflow-hidden border border-black/10 shadow-[2px_2px_8px_rgba(0,0,0,0.15)] z-10 bg-white">
                        <img
                          src={book.cover_url || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=600&auto=format&fit=crop"}
                          alt={book.title}
                          className="w-full h-full object-cover"
                        />
                        {/* Hinge / Spine Gradient Overlay */}
                        <div className="absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-black/30 via-black/5 to-transparent mix-blend-multiply"></div>
                        <div className="absolute inset-y-0 left-[1px] w-[1px] bg-white/40"></div>
                      </div>
                    </div>
                    
                    <span className="absolute top-4 left-4 bg-white/90 backdrop-blur-md border border-neutral-200/50 px-2.5 py-1 rounded-full text-[9px] font-extrabold text-neutral-700 uppercase tracking-wider shadow-2xs z-20">
                      {book.category}
                    </span>
                    <span className="absolute top-4 right-4 bg-orange-100/90 backdrop-blur-md text-secondary border border-orange-200/50 px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-wider shadow-2xs z-20">
                      {book.status}
                    </span>
                  </div>

                  {/* Body Info */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-1.5">
                      <h3 className="font-heading font-extrabold text-lg text-neutral-900 group-hover:text-secondary transition-colors line-clamp-1">
                        {book.title}
                      </h3>
                      <p className="text-xs text-neutral-500 line-clamp-2 font-medium">
                        {book.subtitle}
                      </p>
                    </div>

                    {/* Progress Bar (Masquée ou adaptée) */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold text-neutral-600">
                        <span>Progression</span>
                        <span className="text-secondary font-bold">En cours</span>
                      </div>
                      <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-secondary rounded-full transition-all duration-300"
                          style={{ width: "50%" }}
                        ></div>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono pt-1">
                        <span>{book.chapters?.[0]?.count || 0} chapitres</span>
                        <span>{new Date(book.updated_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
                      <Link
                        href={`/redaction?projectId=${book.id}`}
                        className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5"
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
                        className="p-2.5 rounded-xl bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition-colors flex items-center justify-center"
                        title="Créer une couverture"
                      >
                        <span className="material-symbols-outlined text-base">palette</span>
                      </Link>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDuplicateBook(book)}
                          className="p-2 rounded-xl text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
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
            <div className="bg-white rounded-2xl border border-neutral-200/80 overflow-hidden">
              
              {/* Table Header */}
              <div className="hidden sm:grid grid-cols-12 gap-4 px-5 py-4 border-b border-neutral-100 bg-neutral-50/50">
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
                    <span className="material-symbols-outlined text-[10px] text-neutral-400 hover:text-neutral-700 cursor-pointer">expand_less</span>
                    <span className="material-symbols-outlined text-[10px] text-neutral-400 hover:text-neutral-700 cursor-pointer">expand_more</span>
                  </div>

                  {/* Titre */}
                  <div className="col-span-6 flex items-center gap-4 min-w-0">
                    <div className="w-14 h-10 sm:w-16 sm:h-12 rounded-lg bg-neutral-200 overflow-hidden shrink-0 border border-neutral-200 shadow-2xs">
                      <img src={book.cover_url || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=600&auto=format&fit=crop"} alt={book.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <h3 className="font-heading font-extrabold text-sm text-neutral-900 truncate">
                        {book.title}
                      </h3>
                      <p className="text-[11px] font-bold text-emerald-600 truncate">{book.chapters?.[0]?.count || 0} chapitres</p>
                    </div>
                  </div>

                  {/* Auteur */}
                  <div className="col-span-3 text-xs font-semibold text-neutral-500 truncate">
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
                      className="bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-1.5"
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
                      className="bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold px-3 py-2 rounded-xl transition-all flex items-center gap-1"
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

      {/* CREATE NEW BOOK MODAL WIZARD */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-neutral-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-neutral-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start">
              <div>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-secondary font-bold text-[11px] uppercase tracking-wider">
                  <span className="material-symbols-outlined text-sm">auto_awesome</span>
                  <span>Assistant Création Iris</span>
                </span>
                <h2 className="font-heading font-extrabold text-2xl text-neutral-900 mt-2">
                  Créer un nouveau livre
                </h2>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-2 text-neutral-400 hover:text-neutral-900 rounded-full hover:bg-neutral-100"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateBook} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-800 uppercase tracking-wider mb-1.5">
                  Titre du livre *
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: Les 7 Clefs du Succès Financier"
                  className="w-full px-4 py-3 text-sm border border-neutral-200 rounded-xl focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none font-medium text-neutral-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-800 uppercase tracking-wider mb-1.5">
                  Sous-titre (optionnel)
                </label>
                <input
                  type="text"
                  value={newSubtitle}
                  onChange={(e) => setNewSubtitle(e.target.value)}
                  placeholder="Ex: Guide pratique pour entrepreneurs africains"
                  className="w-full px-4 py-3 text-sm border border-neutral-200 rounded-xl focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none font-medium text-neutral-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-800 uppercase tracking-wider mb-1.5">
                  Catégrie / Thématique
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-4 py-3 text-sm border border-neutral-200 rounded-xl focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none font-medium text-neutral-900 bg-white"
                >
                  <option>Business & Entrepreneuriat</option>
                  <option>Développement Personnel & Coaching</option>
                  <option>Cuisine & Gastronomie</option>
                  <option>Histoire & Roman</option>
                  <option>Santé & Bien-être</option>
                  <option>Technologie & Marketing Digital</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-800 uppercase tracking-wider mb-1.5">
                  Taille du livre estimée
                </label>
                <select
                  value={newLength}
                  onChange={(e) => setNewLength(e.target.value)}
                  className="w-full px-4 py-3 text-sm border border-neutral-200 rounded-xl focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none font-medium text-neutral-900 bg-white"
                >
                  <option>Court (~20 pages)</option>
                  <option>Moyen (~70 pages)</option>
                  <option>Long (~150 pages)</option>
                </select>
              </div>

              {/* Estimate Cost Block */}
              <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 mt-2">
                <p className="text-xs font-bold text-neutral-600 mb-2 uppercase tracking-wider">
                  Coût estimé pour la rédaction totale :
                </p>
                <div className="space-y-2 text-sm">
                  {(() => {
                    let words = 17500;
                    let chapters = 20;
                    if (newLength.includes("Court")) { words = 5000; chapters = 6; }
                    if (newLength.includes("Long")) { words = 37500; chapters = 45; }
                    
                    const wordsPerChapter = Math.round(words / chapters);
                    const flashCost = estimateChapterCoins(wordsPerChapter, "gemini-2.5-flash") * chapters;
                    const gptCost = estimateChapterCoins(wordsPerChapter, "gpt-4o") * chapters;
                    
                    return (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-neutral-600">Modèle basique (Gemini Flash) :</span>
                          <span className="font-bold text-amber-600">~{flashCost} pièces</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-neutral-600">Modèle premium (GPT-4o / Claude) :</span>
                          <span className="font-bold text-amber-600">~{gptCost} pièces</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs text-neutral-600 hover:bg-neutral-100"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="bg-secondary hover:bg-orange-600 text-white font-bold text-xs px-6 py-3 rounded-xl shadow-md transition-all flex items-center gap-2"
                >
                  <span>Lancer la co-rédaction</span>
                  <span className="material-symbols-outlined text-base">arrow_forward</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EXPORT / DOWNLOAD MODAL */}
      <ExportBookModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        project={selectedProjectForExport}
      />

      {/* DELETE CONFIRMATION MODAL */}
      {projectToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl scale-100 animate-slideUp">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-red-600 text-2xl">delete</span>
            </div>
            <h3 className="text-xl font-bold text-center text-neutral-900 mb-2">Supprimer le projet ?</h3>
            <p className="text-center text-sm text-neutral-500 mb-6">
              Cette action est irréversible. Toutes les données de ce livre seront définitivement perdues.
            </p>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setProjectToDelete(null)}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 transition-colors"
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
