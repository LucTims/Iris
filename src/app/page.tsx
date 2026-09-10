"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import ToolMarquee from "@/components/ToolMarquee";
import Footer from "@/components/Footer";
import { useUser } from "@/hooks/useUser";
import { ArrowRight, Feather, Menu, X } from "lucide-react";

export default function Home() {
  const { user } = useUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-neutral-900 font-landing selection:bg-orange-100 flex flex-col justify-between">
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
      <nav className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-md border-b border-neutral-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 sm:h-20 flex items-center justify-between">
          <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2.5 group shrink-0">
            <img src="/iris-logo.png" alt="Iris" className="w-8 h-8 sm:w-9 sm:h-9 object-contain group-hover:scale-105 transition-transform" />
            <span className="font-heading font-extrabold text-2xl sm:text-3xl tracking-tight text-neutral-900">
              Iris
            </span>
          </Link>

          {/* Center Links */}
          <div className="hidden md:flex items-center gap-8 font-semibold text-sm text-neutral-700">
            <Link href="/presentation" className="hover:text-neutral-900 transition-colors flex items-center gap-1.5 text-[#C84B31] font-bold">
              <span>Découvrir Iris</span>
              <span className="text-[10px] uppercase tracking-wider bg-[#FDF3F1] border border-[#F4C5BC] px-1.5 py-0.5 rounded-full font-bold">Livre offert</span>
            </Link>
            <Link href="/features" className="hover:text-neutral-900 transition-colors">Fonctionnalités</Link>
            <Link href="/how-it-works" className="hover:text-neutral-900 transition-colors">Comment ça marche</Link>
            <Link href="/pricing" className="hover:text-neutral-900 transition-colors">Tarifs</Link>
          </div>

          {/* Right Action */}
          <div className="hidden md:flex items-center gap-5 shrink-0">
            <Link href="/login" className="font-semibold text-sm text-neutral-700 hover:text-neutral-900 transition-colors">
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
            className="md:hidden p-2 rounded-xl text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
            aria-label="Ouvrir le menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-neutral-200 px-5 pt-3 pb-6 space-y-3 shadow-lg animate-in slide-in-from-top-2 duration-150">
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
              className="block py-2 text-sm font-semibold text-neutral-700 hover:text-neutral-900"
            >
              Fonctionnalités
            </Link>
            <Link
              href="/how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-semibold text-neutral-700 hover:text-neutral-900"
            >
              Comment ça marche
            </Link>
            <Link
              href="/pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-semibold text-neutral-700 hover:text-neutral-900"
            >
              Tarifs
            </Link>
            <div className="pt-3 border-t border-neutral-100 flex flex-col gap-2.5">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 text-center text-sm font-semibold text-neutral-700 hover:text-neutral-900"
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
      <section className="relative pt-28 pb-16 sm:pt-32 sm:pb-20 lg:pt-36 lg:pb-24 overflow-hidden bg-white">
        
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
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            
            {/* Left Column: Hero Content */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="lg:col-span-7 flex flex-col items-start text-left"
            >
              {/* Badge Pill */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FDF3F1] border border-[#F4C5BC]/70 text-[#C84B31] text-xs font-semibold mb-6 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C84B31] inline-block shrink-0"></span>
                <span>La première co-création littéraire assistée par IA</span>
              </div>

              {/* Main Title */}
              <h1 className="font-heading text-4xl sm:text-5xl lg:text-[54px] xl:text-[60px] font-extrabold text-neutral-900 tracking-tight leading-[1.1] mb-6">
                Votre savoir mérite un livre. <span className="text-[#C84B31]">Iris</span>{" "}l&apos;écrit avec vous.
              </h1>

              {/* Subtitle */}
              <p className="text-base sm:text-lg text-neutral-600 leading-relaxed max-w-xl mb-8 font-normal">
                Transformez votre expertise en un livre prêt à publier. Rédigez et mettez en page chaque chapitre facilement avec votre assistant IA.
              </p>

              {/* Action Buttons Row */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 mb-5 w-full sm:w-auto">
                <Link href={user ? "/dashboard" : "/register"} className="w-full sm:w-auto">
                  <button className="w-full sm:w-auto bg-[#C84B31] hover:bg-[#B83E26] text-white px-7 py-3.5 rounded-full text-sm sm:text-base font-bold transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 cursor-pointer">
                    <span>Commencer gratuitement</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </Link>
                <Link href="/how-it-works" className="w-full sm:w-auto">
                  <button className="w-full sm:w-auto bg-white border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 text-neutral-800 px-6 py-3.5 rounded-full text-sm sm:text-base font-semibold transition-all shadow-2xs flex items-center justify-center cursor-pointer">
                    <span>Voir comment ça marche</span>
                  </button>
                </Link>
              </div>

              {/* Micro-copy */}
              <p className="text-xs sm:text-[13px] text-neutral-400 font-medium">
                Sans carte bancaire · Export prêt à publier · .docx / .epub
              </p>
            </motion.div>

            {/* Right Column: Interactive Editor Mockup Card with Floating Animation */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ 
                opacity: 1, 
                y: [0, -10, 0],
              }}
              transition={{ 
                opacity: { duration: 0.6, delay: 0.2 },
                y: { duration: 5, repeat: Infinity, ease: "easeInOut" },
              }}
              className="lg:col-span-5 w-full flex justify-center lg:justify-end relative group"
            >
              {/* Soft atmospheric background glow */}
              <div className="absolute -inset-2 bg-gradient-to-tr from-[#C84B31]/15 to-amber-100/30 rounded-3xl blur-2xl opacity-60 pointer-events-none -z-10" />

              <div className="w-full max-w-[480px] bg-white rounded-3xl border border-neutral-200/90 shadow-xl sm:shadow-2xl p-5 sm:p-7 relative overflow-hidden transition-all duration-300 hover:shadow-3xl">
                
                {/* Mockup Window Header */}
                <div className="flex items-center justify-between border-b border-neutral-100 pb-4 mb-6">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-neutral-300 inline-block"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-neutral-300 inline-block"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-neutral-300 inline-block"></span>
                  </div>
                  <span className="text-xs font-semibold text-neutral-500 font-heading">
                    Chapitre 3 — La traversée
                  </span>
                  <div className="w-8"></div>
                </div>

                {/* Skeleton Manuscript Lines with subtle shimmer on highlighted line */}
                <div className="space-y-3.5 mb-7">
                  <div className="h-2.5 bg-neutral-200/70 rounded-full w-[85%]"></div>
                  <div className="h-2.5 bg-neutral-200/70 rounded-full w-full"></div>
                  <motion.div 
                    animate={{ opacity: [0.75, 1, 0.75] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                    className="h-2.5 bg-[#F4C5BC] rounded-full w-[65%]"
                  />
                  <div className="h-2.5 bg-neutral-200/70 rounded-full w-[92%]"></div>
                  <div className="h-2.5 bg-neutral-200/70 rounded-full w-[70%]"></div>
                </div>

                {/* AI Suggestion Box */}
                <div className="bg-[#FFF5F3] border border-[#F4C5BC]/60 rounded-2xl p-4 sm:p-4.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 shadow-2xs">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <motion.div 
                      animate={{ rotate: [0, -6, 6, 0] }}
                      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                      className="w-6 h-6 rounded-full bg-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs border border-[#F4C5BC]/50"
                    >
                      <Feather className="w-3.5 h-3.5 text-[#C84B31]" />
                    </motion.div>
                    <p className="text-xs sm:text-[13px] text-neutral-800 leading-snug font-medium">
                      J&apos;ai ajouté plus de suspense au chapitre 3. Voulez-vous que je relise le chapitre suivant ?
                    </p>
                  </div>

                  <Link href={user ? "/dashboard" : "/register"} className="shrink-0 w-full sm:w-auto">
                    <button className="w-full sm:w-auto bg-[#C84B31] hover:bg-[#B83E26] text-white text-[11px] sm:text-xs font-bold px-3.5 py-2 rounded-full whitespace-nowrap transition-all shadow-2xs hover:shadow-xs flex items-center justify-center gap-1 cursor-pointer">
                      <span>Aller au chapitre</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </Link>
                </div>

              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* Tools Replacement Marquee Section */}
      <ToolMarquee />

      {/* Features Section */}
      <section id="features" className="py-16 md:py-20 bg-neutral-50/60">
        <div className="max-w-7xl mx-auto px-6">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="font-heading text-3xl md:text-5xl font-extrabold text-neutral-900 mb-4 tracking-tight">
              Une expérience de création sans effort
            </h2>
            <p className="text-lg md:text-xl text-neutral-600">
              Iris s&apos;occupe de la structure, de la rédaction et de la mise en forme pour que vous puissiez vous concentrer sur vos idées.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: "chat",
                title: "Assistant Co-Rédaction",
                desc: "Échangez naturellement avec l'IA. Elle pose les bonnes questions et rédige vos chapitres selon votre style."
              },
              {
                icon: "palette",
                title: "Design & Couvertures HD",
                desc: "Générez des couvertures d'eBooks professionnelles adaptées à Amazon Kindle, Kobo et aux formats papier."
              },
              {
                icon: "download",
                title: "Export Multi-Formats",
                desc: "Téléchargez votre livre prêt à vendre aux formats PDF, EPUB et DOCX en un seul clic."
              }
            ].map((feat, idx) => (
              <div key={idx} className="bg-white rounded-3xl p-8 border border-neutral-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="w-14 h-14 rounded-2xl bg-orange-50 text-secondary border border-orange-100 flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-3xl">{feat.icon}</span>
                  </div>
                  <h3 className="font-heading text-2xl font-bold text-neutral-900 mb-3">{feat.title}</h3>
                  <p className="text-base text-neutral-600 leading-relaxed">{feat.desc}</p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

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
            <button className="bg-secondary hover:bg-[#E0482B] text-white px-10 py-5 rounded-full text-xl font-bold transition-all shadow-lg hover:scale-105 inline-flex items-center gap-3">
              <span>Démarrer l&apos;expérience Iris</span>
              <span className="material-symbols-outlined text-2xl">arrow_forward</span>
            </button>
          </Link>
        </div>
      </section>

      {/* Antigravity-Style Footer */}
      <Footer />

    </div>
  );
}
