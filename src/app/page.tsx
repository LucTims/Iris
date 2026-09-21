"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import ToolMarquee from "@/components/ToolMarquee";
import BookShowcaseMarquee from "@/components/BookShowcaseMarquee";
import GenreCloudSection from "@/components/GenreCloudSection";
import HeroVideoShowcase from "@/components/HeroVideoShowcase";
import Footer from "@/components/Footer";
import { useUser } from "@/hooks/useUser";
import { ArrowRight, Menu, X, MessageSquare, Palette, Download } from "lucide-react";
import { IrisMark } from "@/components/IrisLogo";

export default function Home() {
  const { user } = useUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 font-landing selection:bg-orange-100 flex flex-col justify-between">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "Iris",
            "operatingSystem": "Web",
            "applicationCategory": "BusinessApplication",
            "url": "https://www.irisboom.online",
            "description": "Iris est la première plateforme de co-création littéraire assistée par IA. Transformez votre expertise en un livre numérique prêt à être publié.",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "EUR"
            },
            "creator": {
              "@type": "Organization",
              "name": "IrisBoom",
              "url": "https://www.irisboom.online"
            }
          })
        }}
      />
      
      {/* Navigation Bar */}
      <nav className="fixed top-0 w-full z-50 bg-white dark:bg-neutral-900/95 backdrop-blur-md border-b border-neutral-200/80 dark:border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 sm:h-20 flex items-center justify-between">
          <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-1 group shrink-0">
            <IrisMark size={34} className="text-brand shrink-0 group-hover:scale-105 rotate-6 transition-transform" />
            <span className="font-heading font-extrabold text-2xl sm:text-3xl tracking-tight text-neutral-900">
              ris
            </span>
          </Link>

          {/* Center Links */}
          <div className="hidden md:flex items-center gap-8 font-semibold text-sm text-neutral-700 dark:text-neutral-300">
            <Link href="/presentation" className="hover:text-neutral-900 dark:text-neutral-100 transition-colors flex items-center gap-1.5 text-[#C84B31] font-bold">
              <span>Découvrir Iris</span>
              <span className="text-[10px] uppercase tracking-wider bg-[#FDF3F1] border border-[#F4C5BC] px-1.5 py-0.5 rounded-full font-bold">Livre offert</span>
            </Link>
            <Link href="/features" className="hover:text-neutral-900 dark:text-neutral-100 transition-colors">Fonctionnalités</Link>
            <Link href="/how-it-works" className="hover:text-neutral-900 dark:text-neutral-100 transition-colors">Comment ça marche</Link>
            <Link href="/pricing" className="hover:text-neutral-900 dark:text-neutral-100 transition-colors">Tarifs</Link>
          </div>

          {/* Right Action */}
          <div className="hidden md:flex items-center gap-5 shrink-0">
            <Link href="/login" className="font-semibold text-sm text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:text-neutral-100 transition-colors">
              Se connecter
            </Link>
            <Link href={user ? "/dashboard" : "/register"}>
              <button className="bg-[#C84B31] hover:bg-[#B83E26] text-white px-5 py-2.5 rounded-full text-sm font-semibold transition-all shadow-xs hover:shadow-sm flex items-center gap-1.5 cursor-pointer">
                <span>Commencer gratuitement</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
          </div>

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:text-neutral-100 hover:bg-neutral-100 dark:bg-neutral-800 transition-colors cursor-pointer"
            aria-label="Ouvrir le menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-5 pt-3 pb-6 space-y-3 shadow-lg animate-in slide-in-from-top-2 duration-150">
            <Link
              href="/presentation"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between py-2 text-sm font-bold text-[#C84B31]"
            >
              <span>Découvrir Iris & Livre offert</span>
              <span className="text-[10px] uppercase tracking-wider bg-[#FDF3F1] border border-[#F4C5BC] px-1.5 py-0.5 rounded-full font-bold">Gratuit</span>
            </Link>
            <Link
              href="/features"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:text-neutral-100"
            >
              Fonctionnalités
            </Link>
            <Link
              href="/how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:text-neutral-100"
            >
              Comment ça marche
            </Link>
            <Link
              href="/pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:text-neutral-100"
            >
              Tarifs
            </Link>
            <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex flex-col gap-2.5">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 text-center text-sm font-semibold text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:text-neutral-100"
              >
                Se connecter
              </Link>
              <Link
                href={user ? "/dashboard" : "/register"}
                onClick={() => setMobileMenuOpen(false)}
              >
                <button className="w-full bg-[#C84B31] hover:bg-[#B83E26] text-white py-3 rounded-full text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer">
                  <span>Commencer gratuitement</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section with Dot Matrix Grid Background */}
      <section className="relative pt-28 pb-16 sm:pt-32 sm:pb-20 lg:pt-36 lg:pb-24 overflow-hidden bg-white dark:bg-neutral-900">
        
        {/* Dot Matrix Canvas Background Grid - DISCREET VISIBILITY & GRADUAL FADE OUT */}
        <div 
          className="absolute inset-0 opacity-40 pointer-events-none z-0" 
          style={{
            backgroundImage: 'radial-gradient(#cbd5e1 1.2px, transparent 1.2px)',
            backgroundSize: '20px 20px',
            maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 75%, rgba(0,0,0,0) 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 75%, rgba(0,0,0,0) 100%)'
          }}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          {/* Centered Hero Content */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl lg:max-w-4xl mx-auto flex flex-col items-center text-center"
          >
            {/* Badge Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FDF3F1] border border-[#F4C5BC]/70 text-[#C84B31] text-xs font-semibold mb-6 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C84B31] inline-block shrink-0"></span>
              <span>La première co-création littéraire assistée par IA</span>
            </div>

            {/* Main Title */}
            <h1 className="font-heading text-4xl sm:text-5xl lg:text-[54px] xl:text-[62px] font-extrabold text-neutral-900 dark:text-neutral-100 tracking-tight leading-[1.1] mb-6">
              Votre savoir mérite un livre. <br />
              <span className="inline-flex items-center text-[#C84B31] gap-1 relative top-[0.1em]">
                <IrisMark className="w-[0.9em] h-[0.9em] rotate-6" />
                <span>ris</span>
              </span>{" "}l&apos;écrit avec vous.
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg lg:text-xl text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-2xl mb-8 font-normal">
              Transformez votre expertise en un livre prêt à publier. Rédigez et mettez en page chaque chapitre facilement avec votre assistant IA.
            </p>

            {/* Action Buttons Row */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3.5 mb-5 w-full sm:w-auto">
              <Link href={user ? "/dashboard" : "/register"} className="w-full sm:w-auto">
                <button className="w-full sm:w-auto bg-[#C84B31] hover:bg-[#B83E26] text-white px-7 py-3.5 rounded-full text-sm sm:text-base font-bold transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 cursor-pointer">
                  <span>Commencer gratuitement</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
              <Link href="/how-it-works" className="w-full sm:w-auto">
                <button className="w-full sm:w-auto bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 hover:bg-neutral-50 dark:bg-neutral-800/50 text-neutral-800 dark:text-neutral-200 px-6 py-3.5 rounded-full text-sm sm:text-base font-semibold transition-all shadow-2xs flex items-center justify-center cursor-pointer">
                  <span>Voir comment ça marche</span>
                </button>
              </Link>
            </div>

            {/* Micro-copy */}
            <p className="text-xs sm:text-[13px] text-neutral-400 font-medium">
              Sans carte bancaire · Export prêt à publier · .docx / .epub
            </p>
          </motion.div>

          {/* Full-width Presentation Video Showcase */}
          <HeroVideoShowcase />
        </div>
      </section>

      {/* Real Books Showcase Marquee Section */}
      <BookShowcaseMarquee />

      {/* Tools Replacement Marquee Section (Services qu'Iris remplace) */}
      <ToolMarquee />

      {/* Features Section */}
      <section id="features" className="py-16 md:py-20 bg-neutral-50/60">
        <div className="max-w-7xl mx-auto px-6">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="font-heading text-3xl md:text-5xl font-extrabold text-neutral-900 dark:text-neutral-100 mb-4 tracking-tight">
              Une expérience de création sans effort
            </h2>
            <p className="text-lg md:text-xl text-neutral-600 dark:text-neutral-400">
              Iris s&apos;occupe de la structure, de la rédaction et de la mise en forme pour que vous puissiez vous concentrer sur vos idées.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: MessageSquare,
                title: "Assistant Co-Rédaction",
                desc: "Échangez naturellement avec l'IA. Elle pose les bonnes questions et rédige vos chapitres selon votre style."
              },
              {
                icon: Palette,
                title: "Design & Couvertures HD",
                desc: "Générez des couvertures d'eBooks professionnelles adaptées à Amazon Kindle, Kobo et aux formats papier."
              },
              {
                icon: Download,
                title: "Export Multi-Formats",
                desc: "Téléchargez votre livre prêt à vendre aux formats PDF, EPUB et DOCX en un seul clic."
              }
            ].map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <div key={idx} className="bg-white dark:bg-neutral-900 rounded-3xl p-8 border border-neutral-200/80 dark:border-neutral-800 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                  <div>
                    <div className="w-14 h-14 rounded-2xl bg-[#FDF3F1] text-[#C84B31] border border-[#F4C5BC]/60 flex items-center justify-center mb-6">
                      <Icon className="w-7 h-7" />
                    </div>
                    <h3 className="font-heading text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-3">{feat.title}</h3>
                    <p className="text-base text-neutral-600 dark:text-neutral-400 leading-relaxed">{feat.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* Genre Cloud Section ("Écrivez tout ce que vous pouvez imaginer") */}
      <GenreCloudSection />

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-[#8C2717] via-[#A8321D] to-[#C84B31] text-white relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <h2 className="font-heading text-4xl md:text-6xl font-extrabold mb-6 tracking-tight">
            Prêt à publier votre premier livre ?
          </h2>
          <p className="text-xl text-neutral-300 mb-10 max-w-2xl mx-auto">
            Rejoignez des centaines d&apos;auteurs et d&apos;experts qui ont déjà donné vie à leurs ouvrages grâce à Iris.
          </p>
          <Link href="/register">
            <button className="bg-secondary hover:bg-[#E0482B] text-white px-10 py-5 rounded-full text-xl font-bold transition-all shadow-lg hover:scale-105 inline-flex items-center gap-3 cursor-pointer">
              <span>Démarrer l&apos;expérience Iris</span>
              <ArrowRight className="w-6 h-6" />
            </button>
          </Link>
        </div>
      </section>

      {/* Antigravity-Style Footer */}
      <Footer />

    </div>
  );
}
