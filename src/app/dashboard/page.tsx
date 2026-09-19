"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import { useUser } from "@/hooks/useUser";
import { useProjects } from "@/hooks/useProjects";
import { BookOpen, Clock, CheckCircle2, ArrowRight, Download, Palette, Sparkles } from "lucide-react";

const QuillAnimation = dynamic(() => import("@/components/QuillAnimation"), { ssr: false });
const ExportBookModal = dynamic(() => import("@/components/ExportBookModal"), { ssr: false });

export default function DashboardPage() {
  const { displayName } = useUser();
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [selectedProjectForExport, setSelectedProjectForExport] = useState<any | null>(null);

  const { projects } = useProjects();

  const handleOpenExportModal = (project: any) => {
    setSelectedProjectForExport(project);
    setIsExportModalOpen(true);
  };

  const hasProjects = projects.length > 0;
  const firstName = displayName ? displayName.split(" ")[0] : "Auteur";

  return (
    <AppLayout>
      {/* Dashboard Main Container */}
      <main className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto w-full space-y-8">
        

        {/* 2. PERSONALIZED GREETING */}
        <div className="space-y-1">
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
            Bonjour {firstName}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
            {hasProjects 
              ? `Poursuivez la rédaction de votre projet « ${projects[0].title} ».` 
              : "Commencez la rédaction de votre tout premier livre dès aujourd'hui."}
          </p>
        </div>

        {/* QUILL ANIMATION — Empty State Hero */}
        {!hasProjects && (
          <QuillAnimation />
        )}

        {/* 3. CORE METRICS — Only when projects exist */}
        {hasProjects && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          
          {/* Card 1: Books in progress */}
          <div className="bg-white dark:bg-neutral-900 rounded-2xl p-5 sm:p-6 border border-neutral-200/80 dark:border-neutral-800 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-700 dark:text-neutral-300">
                <BookOpen className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                Actif
              </span>
            </div>
            <div>
              <span className="font-heading font-bold text-2xl text-neutral-900 dark:text-neutral-100 block mb-0.5">
                {projects.length} {projects.length > 1 ? "ouvrages" : "ouvrage"}
              </span>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">Projets en cours de rédaction</span>
            </div>
          </div>

          {/* Card 2: Time Saved */}
          <div className="bg-white dark:bg-neutral-900 rounded-2xl p-5 sm:p-6 border border-neutral-200/80 dark:border-neutral-800 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-700 dark:text-neutral-300">
                <Clock className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-md">
                Estimation
              </span>
            </div>
            <div>
              <span className="font-heading font-bold text-2xl text-neutral-900 dark:text-neutral-100 block mb-0.5">
                ~{projects.length * 40} h
              </span>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">Temps de rédaction économisé</span>
            </div>
          </div>

          {/* Card 3: Completed Books */}
          <div className="bg-white dark:bg-neutral-900 rounded-2xl p-5 sm:p-6 border border-neutral-200/80 dark:border-neutral-800 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-700 dark:text-neutral-300">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-md">
                Publiables
              </span>
            </div>
            <div>
              <span className="font-heading font-bold text-2xl text-neutral-900 dark:text-neutral-100 block mb-0.5">
                {projects.filter(p => p.status === "Terminé").length}
              </span>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">Livres finalisés</span>
            </div>
          </div>

        </div>
        )}

        {/* 4. MES LIVRES & PROJETS EN COURS */}
        {hasProjects && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-heading font-bold text-lg text-neutral-900 dark:text-neutral-100">Mes Projets de Livres</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Poursuivez la rédaction de vos ouvrages en cours</p>
            </div>
            <Link href="/projects/new">
              <button className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 text-neutral-800 dark:text-neutral-200 text-xs font-semibold px-3.5 py-2 rounded-xl transition-colors shadow-2xs">
                + Nouveau Livre
              </button>
            </Link>
          </div>

          {/* Book Projects Cards */}
          <div className="grid grid-cols-1 gap-3 sm:gap-4">
            {projects.map((book) => (
              <div 
                key={book.id} 
                className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 p-4 sm:p-5 shadow-2xs hover:border-neutral-300 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <div className="w-11 h-14 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center text-neutral-400 shrink-0 overflow-hidden shadow-2xs">
                    {book.cover_url ? (
                      <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                    ) : (
                      <BookOpen className="w-5 h-5 text-neutral-400" />
                    )}
                  </div>
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded">
                        {book.status || "En cours"}
                      </span>
                      <span className="text-xs text-neutral-400">• {new Date(book.updated_at || book.created_at).toLocaleDateString("fr-FR")}</span>
                    </div>
                    <h4 className="font-heading font-bold text-base text-neutral-900 dark:text-neutral-100 truncate">
                      {book.title}
                    </h4>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                      {book.subtitle || book.category || "Manuscrit en cours"}
                    </p>
                  </div>
                </div>

                <div className="w-full md:w-auto shrink-0 flex items-center gap-2 pt-2 md:pt-0">
                  <button
                    onClick={() => handleOpenExportModal(book)}
                    className="bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-semibold px-3 py-2 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                    title="Exporter / Télécharger le livre"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Exporter</span>
                  </button>
                  <Link href={`/redaction?projectId=${book.id}`} className="flex-1 md:flex-none">
                    <button className="w-full md:w-auto bg-[#C84B31] hover:bg-[#B83E26] text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-2xs hover:shadow-xs cursor-pointer">
                      <span>Rédiger</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
        )}

        {/* 5. FONCTIONNALITÉS & OUTILS IRIS */}
        <div className="space-y-4 pt-4">
          <div>
            <h3 className="font-heading font-bold text-lg text-neutral-900 dark:text-neutral-100">Espaces de travail</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Accédez directement aux modules de conception et de publication</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            
            {/* Tool 1 */}
            <div className="bg-white dark:bg-neutral-900 rounded-2xl p-5 border border-neutral-200/80 dark:border-neutral-800 shadow-2xs flex flex-col justify-between space-y-4 hover:border-neutral-300 transition-colors">
              <div>
                <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 flex items-center justify-center mb-3">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h4 className="font-heading font-bold text-sm sm:text-base text-neutral-900 dark:text-neutral-100 mb-1">Studio de Rédaction</h4>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">Rédigez, découpez vos chapitres et profitez de l&apos;assistance IA pour enrichir votre texte au fil de l&apos;écriture.</p>
              </div>
              <Link href={hasProjects ? "/projects" : "/projects/new"}>
                <button className="w-full bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-semibold py-2 rounded-xl border border-neutral-200/80 dark:border-neutral-800 transition-colors">
                  Ouvrir le studio
                </button>
              </Link>
            </div>

            {/* Tool 2 */}
            <div className="bg-white dark:bg-neutral-900 rounded-2xl p-5 border border-neutral-200/80 dark:border-neutral-800 shadow-2xs flex flex-col justify-between space-y-4 hover:border-neutral-300 transition-colors">
              <div>
                <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 flex items-center justify-center mb-3">
                  <Palette className="w-5 h-5" />
                </div>
                <h4 className="font-heading font-bold text-sm sm:text-base text-neutral-900 dark:text-neutral-100 mb-1">Studio de Couvertures</h4>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">Concevez des couvertures professionnelles calibrées pour Amazon KDP, Apple Books et l&apos;impression.</p>
              </div>
              <Link href="/cover-studio">
                <button className="w-full bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-semibold py-2 rounded-xl border border-neutral-200/80 dark:border-neutral-800 transition-colors">
                  Créer une couverture
                </button>
              </Link>
            </div>

            {/* Tool 3 */}
            <div className="bg-white dark:bg-neutral-900 rounded-2xl p-5 border border-neutral-200/80 dark:border-neutral-800 shadow-2xs flex flex-col justify-between space-y-4 hover:border-neutral-300 transition-colors">
              <div>
                <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 flex items-center justify-center mb-3">
                  <Download className="w-5 h-5" />
                </div>
                <h4 className="font-heading font-bold text-sm sm:text-base text-neutral-900 dark:text-neutral-100 mb-1">Exportation Multi-Formats</h4>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">Téléchargez vos manuscrits complets aux formats PDF éditeur, EPUB ebook et Word (.docx).</p>
              </div>
              <Link href="/projects">
                <button className="w-full bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-semibold py-2 rounded-xl border border-neutral-200/80 dark:border-neutral-800 transition-colors">
                  Consulter mes exports
                </button>
              </Link>
            </div>

          </div>
        </div>

        </main>

      {/* EXPORT / DOWNLOAD MODAL */}
      <ExportBookModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        project={selectedProjectForExport}
      />
    </AppLayout>
  );
}
