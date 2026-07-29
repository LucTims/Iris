"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { useUser } from "@/hooks/useUser";

export default function ProjectsPage() {
  const { displayName, displayEmail, signOut } = useUser();
  const userInitials = displayName ? displayName.substring(0, 2).toUpperCase() : "AU";
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("Tous");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // New book form state
  const [newTitle, setNewTitle] = useState("");
  const [newSubtitle, setNewSubtitle] = useState("");
  const [newCategory, setNewCategory] = useState("Business & Entrepreneuriat");

  const [projects, setProjects] = useState<any[]>([]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
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

  useEffect(() => {
    fetchProjects();
  }, []);

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      (project.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (project.subtitle || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (project.category || "").toLowerCase().includes(searchQuery.toLowerCase());

    if (activeFilter === "Tous") return matchesSearch;
    return matchesSearch && project.status === activeFilter;
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
          category: newCategory
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

  const handleDeleteBook = async (id: string) => {
    if (confirm("Voulez-vous vraiment supprimer ce projet de livre ?")) {
      try {
        const res = await fetch(`/api/projects/${id}`, {
          method: "DELETE"
        });
        if (res.ok) {
          setProjects(prev => prev.filter(p => p.id !== id));
        }
      } catch (err) {
        console.error("Erreur de suppression:", err);
      }
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

  return (
    <div className="min-h-screen bg-[#F9FAFB] font-body text-neutral-900 flex flex-col md:flex-row">
      {/* GLOBAL REUSABLE SIDEBAR */}
      <Sidebar />

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-10">
        {/* Top Header */}
        <header className="bg-[#F9FAFB] sticky top-0 z-30 h-16 px-4 md:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-neutral-600 hover:text-neutral-900 bg-neutral-100 px-3 py-2 rounded-xl transition-all">
              <span className="material-symbols-outlined text-base">arrow_back</span>
              <span>Tableau de bord</span>
            </Link>
            <h1 className="font-heading font-extrabold text-xl text-neutral-900">
              Mes Livres & Projets
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/projects/new"
              className="flex items-center gap-2 bg-secondary hover:bg-orange-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-xs"
            >
              <span className="material-symbols-outlined text-base">add</span>
              <span>Nouveau Livre</span>
            </Link>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="w-9 h-9 rounded-full bg-orange-100 border border-orange-300 flex items-center justify-center text-secondary font-extrabold font-heading text-sm cursor-pointer hover:ring-2 hover:ring-orange-300 transition-all"
              >
                ML
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-neutral-200 py-2 z-50">
                  <div className="px-4 py-3 border-b border-neutral-100">
                    <p className="font-heading font-bold text-sm text-neutral-900">Martin Laurent</p>
                    <p className="text-xs text-neutral-500 truncate">martin@exemple.com</p>
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

            {/* Filter Tabs & Grid/List View Toggle */}
            <div className="flex items-center justify-between sm:justify-end gap-3">
              <div className="flex bg-neutral-100 p-1 rounded-xl">
                {["Tous", "En rédaction", "Mise en page", "Terminé"].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      activeFilter === filter
                        ? "bg-white text-neutral-900 shadow-2xs"
                        : "text-neutral-600 hover:text-neutral-900"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>

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
              {filteredProjects.map((book) => (
                <div
                  key={book.id}
                  className="bg-white rounded-2xl border border-neutral-200/80 hover:border-orange-300 transition-all shadow-2xs hover:shadow-md flex flex-col overflow-hidden group"
                >
                  {/* Book Cover Thumbnail Header */}
                  <div className="h-48 bg-neutral-900 relative overflow-hidden flex items-center justify-center">
                    <img
                      src={book.image}
                      alt={book.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-95"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/80 via-transparent to-transparent"></div>
                    <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-neutral-800 uppercase tracking-wider">
                      {book.category}
                    </span>
                    <span className="absolute top-3 right-3 bg-secondary text-white px-3 py-1 rounded-full text-[10px] font-bold">
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

                    {/* Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold text-neutral-600">
                        <span>Progression</span>
                        <span className="text-secondary font-bold">{book.progress}%</span>
                      </div>
                      <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-secondary rounded-full transition-all duration-300"
                          style={{ width: `${book.progress}%` }}
                        ></div>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono pt-1">
                        <span>{book.pages} • {book.words}</span>
                        <span>{book.lastEdited}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
                      <Link
                        href="/redaction"
                        className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-base">edit_note</span>
                        <span>Ouvrir Studio</span>
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
              ))}
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
                      <img src={book.image} alt={book.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <h3 className="font-heading font-extrabold text-sm text-neutral-900 truncate">
                        {book.title}
                      </h3>
                      <p className="text-[11px] font-bold text-emerald-600 truncate">{book.words}</p>
                    </div>
                  </div>

                  {/* Auteur */}
                  <div className="col-span-3 text-xs font-semibold text-neutral-500">
                    Martin Laurent
                  </div>

                  {/* Statut & Plateforme */}
                  <div className="col-span-2 flex items-center justify-end">
                    <span className="bg-orange-50 text-secondary text-[11px] font-bold px-3 py-1 rounded-full shrink-0">
                      {book.status}
                    </span>
                  </div>
                  
                  {/* Mobile Only Actions */}
                  <div className="flex sm:hidden items-center gap-3 w-full justify-end border-t pt-3 mt-2">
                    <Link
                      href="/redaction"
                      className="bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-base">edit_note</span>
                      <span>Studio</span>
                    </Link>
                    <Link
                      href="/cover-studio"
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
      </div>

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
    </div>
  );
}
