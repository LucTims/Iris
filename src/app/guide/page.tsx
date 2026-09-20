"use client";

import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import { 
  BookOpen, 
  Download, 
  CheckCircle2, 
  Palette, 
  ExternalLink, 
  ShieldCheck, 
  FileText,
  Plus
} from "lucide-react";
import { IrisMark } from "@/components/IrisLogo";

export default function GuideDashboardPage() {
  return (
    <AppLayout>
      <main className="p-4 sm:p-6 md:p-10 max-w-6xl mx-auto w-full space-y-8">
        
        {/* Grand Titre Épuré (Sans badge superflu ni paragraphe long) */}
        <div className="text-center max-w-3xl mx-auto pt-2 pb-1">
          <h1 className="font-heading font-extrabold text-2xl sm:text-4xl text-neutral-900 dark:text-neutral-100 tracking-tight leading-tight">
            Donnez vie à vos livres. <br />
            <span className="text-[#C84B31]">De la première idée à la publication.</span>
          </h1>
        </div>

        {/* Section Livre Offert avec Mockup 3D */}
        <section className="bg-gradient-to-b from-[#FAF7F5] to-white border border-[#F4C5BC]/80 rounded-3xl p-5 sm:p-8 lg:p-12 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* Colonne Livre 3D : En premier sur mobile (order-1) et à gauche sur desktop (lg:order-1) */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center order-1 lg:order-1">
              <div className="relative group cursor-pointer" style={{ perspective: "1000px" }}>
                
                {/* Ombre portée réaliste */}
                <div className="absolute -bottom-5 left-4 right-4 h-5 bg-black/20 blur-xl rounded-full transform group-hover:scale-105 transition-transform" />

                {/* Livre 3D Container */}
                <div 
                  className="relative w-56 sm:w-64 md:w-72 h-[340px] sm:h-[380px] md:h-[420px] rounded-r-xl rounded-l-xs shadow-2xl transition-all duration-500 transform group-hover:-translate-y-2 group-hover:rotate-1"
                  style={{
                    transformStyle: "preserve-3d",
                    boxShadow: "-12px 18px 30px -5px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(0, 0, 0, 0.1)"
                  }}
                >
                  {/* Tranche gauche / reliure (Spine) */}
                  <div className="absolute top-0 bottom-0 left-0 w-5 bg-gradient-to-r from-[#9A3412] via-[#C84B31] to-[#7C2D12] rounded-l-xs flex flex-col justify-between py-6 items-center border-r border-black/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-200/60" />
                    <span className="text-[9px] font-mono text-amber-100 tracking-widest uppercase [writing-mode:vertical-rl] rotate-180 font-bold opacity-80">
                      IRIS • GUIDE OFFICIEL
                    </span>
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-200/60" />
                  </div>

                  {/* Couverture face avant */}
                  <div className="absolute inset-0 left-5 bg-gradient-to-br from-[#1C1917] via-[#292524] to-[#0C0A09] rounded-r-xl p-5 sm:p-6 flex flex-col justify-between text-white border-t border-r border-b border-neutral-700/60">
                    
                    {/* Haut de couverture */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <IrisMark size={20} className="text-brand shrink-0" />
                          <span className="text-[10px] font-mono uppercase tracking-widest text-[#F4C5BC]">
                            Éditions Iris
                          </span>
                        </div>
                        <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#C84B31] text-white">
                          Offert
                        </span>
                      </div>

                      <h3 className="font-heading font-extrabold text-xl sm:text-2xl md:text-3xl tracking-tight leading-tight text-white mt-2">
                        Iris : Le Guide Complet
                      </h3>
                      <p className="text-[11px] sm:text-xs text-neutral-400 mt-1 font-serif italic">
                        De l'idée à la publication KDP
                      </p>
                    </div>

                    {/* Écusson central */}
                    <div className="my-auto py-2 flex items-center justify-center">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border border-amber-500/30 bg-amber-500/10 flex items-center justify-center">
                        <BookOpen className="w-7 h-7 sm:w-8 sm:h-8 text-[#C84B31]" />
                      </div>
                    </div>

                    {/* Bas de couverture */}
                    <div className="border-t border-white/15 pt-2.5 flex items-center justify-between text-[10px] sm:text-[11px] text-neutral-400">
                      <span>100% Rédigé avec Iris</span>
                      <span className="text-white font-bold">Format PDF</span>
                    </div>
                  </div>

                  {/* Effet feuillets de pages (tranche droite) */}
                  <div 
                    className="absolute top-1 bottom-1 -right-2.5 w-2.5 rounded-r-xs bg-gradient-to-r from-neutral-200 to-neutral-100 border-r border-neutral-300 shadow-inner pointer-events-none" 
                    style={{
                      backgroundImage: "repeating-linear-gradient(to bottom, #e5e5e5 0px, #e5e5e5 1px, #ffffff 1px, #ffffff 3px)"
                    }}
                  />
                </div>
              </div>

              {/* Boutons de téléchargement direct SUR MOBILE (directement sous le livre) */}
              <div className="w-full lg:hidden mt-8 space-y-3">
                <a
                  href="/IrisGuideComplet.pdf"
                  download="IrisGuideComplet.pdf"
                  className="w-full inline-flex items-center justify-center gap-3 bg-[#C84B31] hover:bg-[#B83E26] text-white px-6 py-4 rounded-full font-bold text-base shadow-sm active:scale-[0.99] transition-all cursor-pointer"
                >
                  <Download className="w-5 h-5" />
                  <span>Télécharger le livre offert (PDF)</span>
                </a>

                <a
                  href="/IrisGuideComplet.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:bg-neutral-800/50 text-neutral-800 dark:text-neutral-200 border border-neutral-300 px-5 py-3.5 rounded-full font-semibold text-sm transition-colors"
                >
                  <span>Feuilleter en ligne</span>
                  <ExternalLink className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
                </a>

                <div className="flex items-center justify-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 pt-1">
                  <ShieldCheck className="w-4 h-4 text-[#C84B31]" />
                  <span>PDF Haute Définition (1,3 Mo) • Gratuit & immédiat</span>
                </div>
              </div>
            </div>

            {/* Informations du livre : Après le livre sur mobile (order-2), à droite sur desktop (lg:order-2) */}
            <div className="lg:col-span-7 space-y-5 order-2 lg:order-2">
              <h2 className="font-heading font-extrabold text-2xl sm:text-3xl text-neutral-900 dark:text-neutral-100 tracking-tight leading-tight">
                Téléchargez « Iris : Le Guide Complet »
              </h2>

              <p className="text-neutral-600 dark:text-neutral-400 text-sm sm:text-base leading-relaxed">
                Découvrez le niveau d'exigence éditoriale, la finesse de rédaction et la mise en page produite par Iris. Cet ouvrage complet de 5 chapitres a été rédigé et exporté à 100% avec notre plateforme.
              </p>

              {/* 3 points clés */}
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center gap-3 text-sm text-neutral-800 dark:text-neutral-200 font-medium">
                  <CheckCircle2 className="w-5 h-5 text-[#C84B31] shrink-0" />
                  <span>La méthode étape par étape pour concevoir un livre avec l'IA</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-neutral-800 dark:text-neutral-200 font-medium">
                  <CheckCircle2 className="w-5 h-5 text-[#C84B31] shrink-0" />
                  <span>Les secrets pour préserver votre voix et un style d'auteur unique</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-neutral-800 dark:text-neutral-200 font-medium">
                  <CheckCircle2 className="w-5 h-5 text-[#C84B31] shrink-0" />
                  <span>Les règles de mise en page et de publication sur Amazon KDP</span>
                </div>
              </div>

              {/* Boutons d'action SUR DESKTOP (caché sur mobile car déjà affiché sous le livre) */}
              <div className="hidden lg:flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
                <a
                  href="/IrisGuideComplet.pdf"
                  download="IrisGuideComplet.pdf"
                  className="inline-flex items-center justify-center gap-3 bg-[#C84B31] hover:bg-[#B83E26] text-white px-7 py-3.5 rounded-full font-bold text-sm sm:text-base shadow-sm hover:shadow-md transition-all cursor-pointer group"
                >
                  <Download className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
                  <span>Télécharger le livre offert (PDF)</span>
                </a>

                <a
                  href="/IrisGuideComplet.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:bg-neutral-800/50 text-neutral-800 dark:text-neutral-200 border border-neutral-300 px-5 py-3.5 rounded-full font-semibold text-sm transition-colors"
                >
                  <span>Feuilleter en ligne</span>
                  <ExternalLink className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
                </a>
              </div>

              <div className="hidden lg:flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                <ShieldCheck className="w-4 h-4 text-[#C84B31]" />
                <span>PDF Haute Définition (1,3 Mo) • Téléchargement direct et immédiat.</span>
              </div>
            </div>

          </div>
        </section>

        {/* 3 Atouts Clés */}
        <section className="pt-2 pb-2">
          <div className="text-center max-w-xl mx-auto mb-6">
            <span className="text-xs font-bold uppercase tracking-wider text-[#C84B31]">L'outil en bref</span>
            <h2 className="font-heading font-extrabold text-xl sm:text-2xl text-neutral-900 dark:text-neutral-100 tracking-tight mt-1">
              Tout ce dont vous avez besoin pour publier
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-[#FDF3F1] text-[#C84B31] flex items-center justify-center mb-3">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="font-heading font-bold text-base text-neutral-900 dark:text-neutral-100 mb-1.5">
                1. Co-rédaction IA
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Structurez vos chapitres et développez vos arguments avec une IA qui respecte votre style et élimine le syndrome de la page blanche.
              </p>
            </div>

            <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-[#FDF3F1] text-[#C84B31] flex items-center justify-center mb-3">
                <Palette className="w-5 h-5" />
              </div>
              <h3 className="font-heading font-bold text-base text-neutral-900 dark:text-neutral-100 mb-1.5">
                2. Studio de Couverture
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Générez des visuels haute résolution aux dimensions standards pour capter l'attention sur Amazon KDP ou votre propre boutique.
              </p>
            </div>

            <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-[#FDF3F1] text-[#C84B31] flex items-center justify-center mb-3">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="font-heading font-bold text-base text-neutral-900 dark:text-neutral-100 mb-1.5">
                3. Export PDF & EPUB
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Téléchargez instantanément votre livre mis en page, prêt pour l'impression papier ou la lecture sur Kindle et smartphones.
              </p>
            </div>
          </div>
        </section>

        {/* Action Membre Connecté */}
        <section className="bg-[#FAF7F5] border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-7 text-center space-y-3">
          <h3 className="font-heading font-extrabold text-xl sm:text-2xl text-neutral-900 dark:text-neutral-100">
            Prêt à lancer votre prochain livre ?
          </h3>
          <p className="text-neutral-600 dark:text-neutral-400 text-sm max-w-md mx-auto">
            Accédez à l'atelier de création pour générer votre plan, rédiger vos chapitres et concevoir votre couverture.
          </p>
          <div className="pt-1">
            <Link href="/projects/new">
              <button className="bg-[#C84B31] hover:bg-[#B83E26] text-white px-7 py-3.5 rounded-full font-bold text-sm shadow-xs hover:shadow transition-all inline-flex items-center gap-2 cursor-pointer">
                <Plus className="w-4 h-4" />
                <span>Créer un nouveau livre</span>
              </button>
            </Link>
          </div>
        </section>

      </main>
    </AppLayout>
  );
}
