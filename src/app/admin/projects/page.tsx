"use client";

import React, { useState } from "react";
import {
  BookOpen,
  Search,
  LayoutGrid,
  List,
  FileText,
  Download,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  BookMarked,
  Filter,
} from "lucide-react";
import { mockAdminProjects } from "@/lib/admin/mockData";
import { AdminProject, ProjectStatus } from "@/lib/admin/types";

export default function AdminProjectsPage() {
  const [projects] = useState<AdminProject[]>(mockAdminProjects);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedGenre, setSelectedGenre] = useState<string>("all");

  const genres = Array.from(new Set(projects.map((p) => p.genre)));

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.author_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (project.subtitle && project.subtitle.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === "all" || project.status === statusFilter;
    const matchesGenre = selectedGenre === "all" || project.genre === selectedGenre;
    return matchesSearch && matchesStatus && matchesGenre;
  });

  const totalWords = projects.reduce((acc, curr) => acc + curr.word_count, 0);
  const avgWords = Math.round(totalWords / (projects.length || 1));
  const publishedCount = projects.filter((p) => p.status === "publie").length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-orange-400" />
            Explorateur de Livres & Manuscrits
          </h1>
          <p className="text-neutral-400 text-sm mt-1">
            Supervision des ouvrages générés, statistiques éditoriales et exports KDP/ePub.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-xl p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                viewMode === "grid" ? "bg-orange-500 text-white" : "text-neutral-400 hover:text-white"
              }`}
              aria-label="Vue Grille"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Grille</span>
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                viewMode === "table" ? "bg-orange-500 text-white" : "text-neutral-400 hover:text-white"
              }`}
              aria-label="Vue Tableau"
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">Tableau</span>
            </button>
          </div>
        </div>
      </div>

      {/* Editorial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-4">
          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Total Manuscrits</span>
          <div className="text-2xl font-black text-white mt-1">{projects.length} livres</div>
          <div className="text-xs text-neutral-500 mt-1">Catalogue complet Iris</div>
        </div>
        <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-4">
          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Livres Publiés</span>
          <div className="text-2xl font-black text-emerald-400 mt-1">{publishedCount} finalisés</div>
          <div className="text-xs text-neutral-500 mt-1">Disponibles à l'export KDP/Fnac</div>
        </div>
        <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-4">
          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Moyenne par Livre</span>
          <div className="text-2xl font-black text-orange-400 mt-1">{avgWords.toLocaleString("fr-FR")} mots</div>
          <div className="text-xs text-neutral-500 mt-1">~{(avgWords / 250).toFixed(0)} pages estimées</div>
        </div>
        <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-4">
          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Volume de Texte Total</span>
          <div className="text-2xl font-black text-purple-400 mt-1">{(totalWords / 1000).toFixed(0)}k mots</div>
          <div className="text-xs text-neutral-500 mt-1">Production globale de la communauté</div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher par titre de livre, nom de l'auteur..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-orange-500 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Status filter */}
          <div className="flex items-center gap-1.5 bg-neutral-900 px-3 py-2 rounded-xl border border-neutral-800">
            <span className="text-xs font-semibold text-neutral-400">Statut :</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs font-medium text-white focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-neutral-900">Tous les statuts</option>
              <option value="brouillon" className="bg-neutral-900">Brouillon</option>
              <option value="en_cours" className="bg-neutral-900">En cours</option>
              <option value="termine" className="bg-neutral-900">Terminé</option>
              <option value="publie" className="bg-neutral-900">Publié</option>
            </select>
          </div>

          {/* Genre filter */}
          <div className="flex items-center gap-1.5 bg-neutral-900 px-3 py-2 rounded-xl border border-neutral-800">
            <span className="text-xs font-semibold text-neutral-400">Genre :</span>
            <select
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
              className="bg-transparent text-xs font-medium text-white focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-neutral-900">Tous les genres</option>
              {genres.map((g) => (
                <option key={g} value={g} className="bg-neutral-900">{g}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className="bg-neutral-950 border border-neutral-800/80 rounded-2xl overflow-hidden hover:border-neutral-700 transition-all flex flex-col group"
            >
              {/* Cover Banner Preview */}
              <div className="h-40 relative bg-neutral-900 overflow-hidden">
                {project.cover_url ? (
                  <img
                    src={project.cover_url}
                    alt={project.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-900 to-neutral-950 text-neutral-600">
                    <BookOpen className="w-12 h-12" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-neutral-900/90 backdrop-blur-xs text-orange-400 border border-orange-500/20">
                    {project.genre}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase backdrop-blur-xs ${
                      project.status === "publie"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : project.status === "termine"
                        ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                        : "bg-neutral-800/90 text-neutral-300 border border-neutral-700"
                    }`}
                  >
                    {project.status}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="font-heading text-lg font-bold text-white group-hover:text-orange-400 transition-colors line-clamp-1">
                    {project.title}
                  </h3>
                  {project.subtitle && (
                    <p className="text-xs text-neutral-400 mt-1 line-clamp-1 italic">
                      {project.subtitle}
                    </p>
                  )}
                  <div className="mt-3 text-xs text-neutral-400">
                    Auteur : <span className="text-white font-semibold">{project.author_name}</span>
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-2 py-3 px-3 rounded-xl bg-neutral-900/60 border border-neutral-900 text-center text-xs">
                  <div>
                    <span className="text-neutral-500 block text-[10px] uppercase">Mots</span>
                    <span className="font-bold text-white">{(project.word_count / 1000).toFixed(1)}k</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block text-[10px] uppercase">Chapitres</span>
                    <span className="font-bold text-white">{project.chapters_count}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block text-[10px] uppercase">Pages</span>
                    <span className="font-bold text-white">~{project.estimated_pages}</span>
                  </div>
                </div>

                {/* Export formats and timestamps */}
                <div className="pt-3 border-t border-neutral-900 flex items-center justify-between text-xs text-neutral-500">
                  <div className="flex items-center gap-1.5">
                    {project.exported_formats.length > 0 ? (
                      project.exported_formats.map((fmt) => (
                        <span
                          key={fmt}
                          className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-neutral-800 text-neutral-300 border border-neutral-700"
                        >
                          {fmt}
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-neutral-600">Aucun export</span>
                    )}
                  </div>
                  <span>
                    Mis à jour {new Date(project.updated_at).toLocaleDateString("fr-FR")}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-neutral-300">
              <thead className="bg-neutral-900/80 text-xs font-semibold uppercase text-neutral-400 tracking-wider border-b border-neutral-800">
                <tr>
                  <th className="px-6 py-4">Titre & Auteur</th>
                  <th className="px-4 py-4">Genre</th>
                  <th className="px-4 py-4">Statut</th>
                  <th className="px-4 py-4">Mots</th>
                  <th className="px-4 py-4">Chapitres</th>
                  <th className="px-4 py-4">Pages</th>
                  <th className="px-4 py-4">Exports</th>
                  <th className="px-6 py-4 text-right">Dernière MàJ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900">
                {filteredProjects.map((project) => (
                  <tr key={project.id} className="hover:bg-neutral-900/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-white">{project.title}</div>
                      <div className="text-xs text-neutral-500">{project.author_name} ({project.author_email})</div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-neutral-900 border border-neutral-800 text-neutral-300">
                        {project.genre}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${
                          project.status === "publie"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : project.status === "termine"
                            ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                            : "bg-neutral-800 text-neutral-400"
                        }`}
                      >
                        {project.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 font-semibold text-white">
                      {project.word_count.toLocaleString("fr-FR")}
                    </td>
                    <td className="px-4 py-4 text-neutral-300">{project.chapters_count}</td>
                    <td className="px-4 py-4 text-neutral-300">~{project.estimated_pages}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1">
                        {project.exported_formats.map((fmt) => (
                          <span
                            key={fmt}
                            className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-neutral-800 text-neutral-300"
                          >
                            {fmt}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-xs text-neutral-400">
                      {new Date(project.updated_at).toLocaleDateString("fr-FR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
