"use client";

import Link from "next/link";
import Footer from "@/components/Footer";
import AppLayout from "@/components/AppLayout";
import { useUser } from "@/hooks/useUser";
import { 
  BookOpen, 
  Download, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Palette, 
  ExternalLink, 
  ShieldCheck, 
  FileText,
  Plus
} from "lucide-react";

export default function PresentationPage() {
  const { user } = useUser();


  // Le cœur du contenu partagé (livre, mockup 3D, infos Iris)
  const PresentationBody = (
    <div className="w-full">
      {/* 1. INTRO IRIS RAPIDE (Vite fait, sans blabla) */}
      <section className="pt-10 pb-6 sm:pt-14 sm:pb-8 text-center max-w-4xl mx-auto px-4 sm:px-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#FDF3F1] border border-[#F4C5BC] text-[#C84B31] text-xs font-bold uppercase tracking-wider mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Studio d'écriture littéraire par IA</span>
        </div>

        <h1 className="font-heading font-extrabold text-3xl sm:text-5xl text-neutral-900 tracking-tight leading-[1.15] mb-4">
          Donnez vie à vos livres. <br />
          <span className="text-[#C84B31]">De la première idée à la publication.</span>
        </h1>

        <p className="text-base sm:text-lg text-neutral-600 max-w-2xl mx-auto leading-relaxed">
          Iris est l'atelier assisté par intelligence artificielle qui vous aide à structurer, co-rédiger et exporter des livres professionnels prêts pour Amazon KDP et les liseuses.
        </p>
      </section>

      {/* 2. LE LIVRE OFFERT AVEC MOCKUP 3D (Cœur de la page & conversion) */}
      <section className="py-6 sm:py-8 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto bg-gradient-to-b from-[#FAF7F5] to-white border border-[#F4C5BC]/80 rounded-3xl p-6 sm:p-10 lg:p-12 shadow-sm">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            
            {/* Mockup 3D du Livre */}
            <div className="lg:col-span-5 flex justify-center order-2 lg:order-1">
              <div className="relative group cursor-pointer" style={{ perspective: "1000px" }}>
                
                {/* Ombre portée réaliste au sol */}
                <div className="absolute -bottom-6 left-6 right-6 h-6 bg-black/20 blur-xl rounded-full transform group-hover:scale-105 transition-transform" />

                {/* Livre 3D Container */}
                <div 
                  className="relative w-64 sm:w-72 h-[380px] sm:h-[420px] rounded-r-xl rounded-l-xs shadow-2xl transition-all duration-500 transform group-hover:-translate-y-2 group-hover:rotate-1"
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
                  <div className="absolute inset-0 left-5 bg-gradient-to-br from-[#1C1917] via-[#292524] to-[#0C0A09] rounded-r-xl p-6 flex flex-col justify-between text-white border-t border-r border-b border-neutral-700/60">
                    
                    {/* Haut de couverture */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <img src="/iris-logo.png" alt="Iris" className="w-5 h-5 object-contain" />
                          <span className="text-[10px] font-mono uppercase tracking-widest text-[#F4C5BC]">
                            Éditions Iris
                          </span>
                        </div>
                        <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#C84B31] text-white">
                          Offert
                        </span>
                      </div>

                      <h3 className="font-heading font-extrabold text-2xl sm:text-3xl tracking-tight leading-tight text-white mt-3">
                        Iris : Le Guide Complet
                      </h3>
                      <p className="text-xs text-neutral-400 mt-2 font-serif italic">
                        De l'idée à la publication KDP
                      </p>
                    </div>

                    {/* Écusson central */}
                    <div className="my-auto py-4 flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full border border-amber-500/30 bg-amber-500/10 flex items-center justify-center">
                        <BookOpen className="w-8 h-8 text-[#C84B31]" />
                      </div>
                    </div>

                    {/* Bas de couverture */}
                    <div className="border-t border-white/15 pt-3 flex items-center justify-between text-[11px] text-neutral-400">
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
            </div>

            {/* Texte de présentation & Bouton de Téléchargement */}
            <div className="lg:col-span-7 space-y-6 order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C84B31] text-white text-xs font-bold uppercase tracking-wider">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Exemple réel à télécharger gratuitement</span>
              </div>

              <h2 className="font-heading font-extrabold text-3xl sm:text-4xl text-neutral-900 tracking-tight leading-tight">
                Téléchargez « Iris : Le Guide Complet »
              </h2>

              <p className="text-neutral-600 text-base leading-relaxed">
                Pour vous prouver la qualité de rédaction et de mise en page d'Iris, nous avons rédigé et exporté cet ouvrage intégral à l'aide de notre outil. Obtenez-le en 1 clic pour découvrir la méthode concrète.
              </p>

              {/* 3 points clés simples */}
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center gap-3 text-sm text-neutral-800 font-medium">
                  <CheckCircle2 className="w-5 h-5 text-[#C84B31] shrink-0" />
                  <span>La méthode étape par étape pour concevoir un livre avec l'IA</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-neutral-800 font-medium">
                  <CheckCircle2 className="w-5 h-5 text-[#C84B31] shrink-0" />
                  <span>Les secrets pour préserver votre voix et un style d'auteur unique</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-neutral-800 font-medium">
                  <CheckCircle2 className="w-5 h-5 text-[#C84B31] shrink-0" />
                  <span>Les règles de mise en page et de publication sur Amazon KDP</span>
                </div>
              </div>

              {/* BOUTON PRINCIPAL DE TÉLÉCHARGEMENT */}
              <div className="pt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <a
                  href="/IrisGuideComplet.pdf"
                  download="IrisGuideComplet.pdf"
                  className="inline-flex items-center justify-center gap-3 bg-[#C84B31] hover:bg-[#B83E26] text-white px-8 py-4 rounded-full font-bold text-base shadow-sm hover:shadow-md transition-all cursor-pointer group"
                >
                  <Download className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
                  <span>Télécharger le livre offert (PDF)</span>
                </a>

                <a
                  href="/IrisGuideComplet.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-300 px-5 py-4 rounded-full font-semibold text-sm transition-colors"
                >
                  <span>Feuilleter en ligne</span>
                  <ExternalLink className="w-4 h-4 text-neutral-500" />
                </a>
              </div>

              <div className="flex items-center gap-2 text-xs text-neutral-500">
                <ShieldCheck className="w-4 h-4 text-[#C84B31]" />
                <span>PDF Haute Définition (1,3 Mo) • Téléchargement direct sans carte bancaire ni inscription.</span>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 3. QUELQUES INFORMATIONS SUR IRIS (Simple, 3 atouts essentiels) */}
      <section className="py-12 sm:py-16 max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-xl mx-auto mb-10">
          <span className="text-xs font-bold uppercase tracking-wider text-[#C84B31]">L'outil en bref</span>
          <h2 className="font-heading font-extrabold text-2xl sm:text-3xl text-neutral-900 tracking-tight mt-1">
            Tout ce dont vous avez besoin pour publier
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-[#FDF3F1] text-[#C84B31] flex items-center justify-center mb-4">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="font-heading font-bold text-lg text-neutral-900 mb-2">
              1. Co-rédaction IA
            </h3>
            <p className="text-sm text-neutral-600 leading-relaxed">
              Structurez vos chapitres et développez vos arguments avec une IA qui respecte votre style et élimine le syndrome de la page blanche.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-[#FDF3F1] text-[#C84B31] flex items-center justify-center mb-4">
              <Palette className="w-5 h-5" />
            </div>
            <h3 className="font-heading font-bold text-lg text-neutral-900 mb-2">
              2. Studio de Couverture
            </h3>
            <p className="text-sm text-neutral-600 leading-relaxed">
              Générez des visuels haute résolution aux dimensions standards pour capter l'attention sur Amazon KDP ou votre propre boutique.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-[#FDF3F1] text-[#C84B31] flex items-center justify-center mb-4">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="font-heading font-bold text-lg text-neutral-900 mb-2">
              3. Export PDF & EPUB
            </h3>
            <p className="text-sm text-neutral-600 leading-relaxed">
              Téléchargez instantanément votre livre mis en page, prêt pour l'impression papier ou la lecture sur Kindle et smartphones.
            </p>
          </div>
        </div>
      </section>

      {/* 4. CALL TO ACTION EN BAS */}
      <section className="py-12 bg-[#FAF7F5] border-t border-neutral-200/80">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center space-y-5">
          <h2 className="font-heading font-extrabold text-3xl sm:text-4xl text-neutral-900 tracking-tight">
            Prêt à écrire votre propre livre ?
          </h2>
          <p className="text-neutral-600 text-sm sm:text-base max-w-xl mx-auto">
            {user 
              ? "Passez à l'action dès maintenant en lançant votre nouveau manuscrit dans l'atelier."
              : "Rejoignez Iris et donnez vie à vos projets d'écriture. 50 pièces vous sont offertes dès l'inscription pour tester l'outil."
            }
          </p>
          
          <div className="pt-2">
            <Link href={user ? "/projects/new" : "/register"}>
              <button className="bg-[#C84B31] hover:bg-[#B83E26] text-white px-8 py-4 rounded-full font-bold text-base shadow-sm hover:shadow transition-all inline-flex items-center gap-2 cursor-pointer">
                <span>{user ? "Créer un nouveau livre" : "Commencer gratuitement"}</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </Link>
          </div>

          <p className="text-xs text-neutral-500">
            {user ? "Accès instantané à votre studio" : "Sans carte bancaire • Prise en main en 2 minutes"}
          </p>
        </div>
      </section>
    </div>
  );

  // SI CONNECTÉ : Vue intégrée dans le tableau de bord avec barre latérale (Sidebar) visible !
  if (user) {
    return (
      <AppLayout>
        <div className="bg-white min-h-full pb-16">
          {PresentationBody}
        </div>
      </AppLayout>
    );
  }

  // SI NON CONNECTÉ : Vue pleine page d'acquisition / publication avec navigation publique et footer
  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans selection:bg-[#FDF3F1] selection:text-[#C84B31] flex flex-col justify-between">
      {/* Navigation Header Publique */}
      <header className="sticky top-0 w-full z-50 bg-white/95 backdrop-blur-md border-b border-neutral-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <img 
              src="/iris-logo.png" 
              alt="Iris Logo" 
              className="w-8 h-8 object-contain group-hover:scale-105 transition-transform" 
            />
            <span className="font-heading font-extrabold text-2xl tracking-tight text-neutral-900">
              Iris
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <Link 
              href="/login" 
              className="hidden sm:inline-block text-sm font-semibold text-neutral-700 hover:text-neutral-900 transition-colors"
            >
              Se connecter
            </Link>
            <Link href="/register">
              <button className="bg-[#C84B31] hover:bg-[#B83E26] text-white px-5 py-2 rounded-full text-sm font-bold transition-all shadow-xs hover:shadow flex items-center gap-1.5 cursor-pointer">
                <span>Essayer gratuitement</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {PresentationBody}
      </main>

      <Footer />
    </div>
  );
}
