"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, Sparkles, CheckCircle2 } from "lucide-react";

interface ShowcaseBook {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  badge: string;
  image: string;
  format: string;
}

const BOOKS: ShowcaseBook[] = [
  {
    id: "cuisine",
    title: "La Cuisine Africaine",
    subtitle: "100 recettes faciles & modernes pour toute la famille",
    category: "Guide Pratique & Gastronomie",
    badge: "Livre de recettes",
    image: "/showcase/cuisine-africaine.webp",
    format: "Mise en page illustrée · PDF & Imprimable",
  },
  {
    id: "discipline",
    title: "L'Art de la Discipline",
    subtitle: "Comment se créer une vie de succès durable",
    category: "Développement Personnel",
    badge: "Méthode & Essai",
    image: "/showcase/developpement-personnel.webp",
    format: "Format broché · KDP & EPUB",
  },
  {
    id: "entrepreneur",
    title: "The Entrepreneur's Strategy",
    subtitle: "Essential frameworks for sustainable business growth",
    category: "Business & Management",
    badge: "Manuel professionnel",
    image: "/showcase/business-strategie.webp",
    format: "Édition reliée · EPUB, PDF & DOCX",
  },
  {
    id: "poesie",
    title: "Échos du Cœur",
    subtitle: "Recueil de poèmes & réflexions intimistes",
    category: "Poésie & Littérature",
    badge: "Édition d'art",
    image: "/showcase/poesie-echos-du-coeur.webp",
    format: "Typographie soignée · Couverture mate",
  },
  {
    id: "roman",
    title: "Mémoires & Roman Historique",
    subtitle: "Une fresque romanesque captivante chapitre par chapitre",
    category: "Roman & Fiction",
    badge: "Roman d'époque",
    image: "/showcase/roman-litteraire.webp",
    format: "Standard KDP · 300+ pages",
  },
];

export default function BookShowcaseMarquee() {
  // We duplicate the list to make the loop seamless
  const duplicatedBooks = [...BOOKS, ...BOOKS, ...BOOKS];

  return (
    <section className="py-20 md:py-28 bg-white dark:bg-neutral-900 border-y border-neutral-100 dark:border-neutral-800 relative overflow-hidden">
      {/* Subtle warm background glows */}
      <div className="absolute top-1/2 -left-40 -translate-y-1/2 w-96 h-96 bg-[#FDF3F1] rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-1/2 -right-40 -translate-y-1/2 w-96 h-96 bg-[#FDF3F1] rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-3xl lg:max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-12 md:mb-16 text-center flex flex-col items-center">
        {/* Pill Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FDF3F1] border border-[#F4C5BC]/70 text-[#C84B31] text-xs font-semibold mb-4 shadow-2xs">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Des créations réelles d&apos;auteurs</span>
        </div>

        {/* Title */}
        <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-extrabold text-neutral-900 dark:text-neutral-100 tracking-tight leading-[1.15]">
          Quel livre allez-vous{" "}
          <span className="text-[#C84B31]">donner au monde</span> ?
        </h2>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-neutral-600 dark:text-neutral-400 mt-4 font-normal leading-relaxed max-w-2xl">
          Romans, guides pratiques, livres de recettes ou essais professionnels : 
          Iris s&apos;adapte à chaque genre littéraire avec une mise en page prête pour l&apos;impression et la vente.
        </p>

        {/* CTA Button */}
        <div className="mt-7">
          <Link href="/register">
            <button className="inline-flex items-center gap-2 bg-[#C84B31] hover:bg-[#B83E26] text-white text-sm font-bold px-7 py-3 rounded-full transition-all shadow-sm hover:shadow-md cursor-pointer">
              <span>Créer mon livre</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
        </div>
      </div>

      {/* Infinite Marquee Container */}
      <div className="relative w-full overflow-hidden py-4 group">
        {/* Left & Right Edge Gradient Masks */}
        <div className="absolute top-0 left-0 w-16 sm:w-32 md:w-48 h-full bg-gradient-to-r from-white via-white/80 to-transparent z-20 pointer-events-none" />
        <div className="absolute top-0 right-0 w-16 sm:w-32 md:w-48 h-full bg-gradient-to-l from-white via-white/80 to-transparent z-20 pointer-events-none" />

        {/* Scrolling Track */}
        <div className="animate-marquee-scroll flex gap-6 sm:gap-8 px-4 sm:px-6">
          {duplicatedBooks.map((book, idx) => (
            <div
              key={`${book.id}-${idx}`}
              className="w-[280px] sm:w-[320px] md:w-[340px] shrink-0 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/90 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1.5 flex flex-col overflow-hidden"
            >
              {/* Book Image */}
              <div className="relative w-full h-[360px] sm:h-[400px] overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                <Image
                  src={book.image}
                  alt={book.title}
                  fill
                  sizes="(max-width: 768px) 280px, 340px"
                  className="object-cover object-center transition-transform duration-700 hover:scale-105"
                  loading="lazy"
                />
                
                {/* Subtle top-left badge */}
                <div className="absolute top-3.5 left-3.5">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-neutral-900/95 backdrop-blur-md text-neutral-800 dark:text-neutral-200 text-[11px] font-bold shadow-xs border border-white/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C84B31]" />
                    {book.badge}
                  </span>
                </div>
              </div>

              {/* Book Details */}
              <div className="p-5 flex flex-col justify-between flex-1 bg-white dark:bg-neutral-900">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#C84B31]">
                    {book.category}
                  </span>
                  <h3 className="font-heading font-extrabold text-neutral-900 dark:text-neutral-100 text-lg sm:text-xl mt-1 leading-snug line-clamp-1">
                    {book.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1.5 line-clamp-2 leading-relaxed">
                    {book.subtitle}
                  </p>
                </div>

                <div className="mt-4 pt-3.5 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-[11px] font-medium text-neutral-400">
                  <span>{book.format}</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Genres Pills */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-10 md:mt-14 text-center">
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          <span className="text-xs font-semibold text-neutral-400 mr-1">Genres pris en charge :</span>
          {[
            "Guides pratiques & culinaires",
            "Romans & Fictions",
            "Business & Entrepreneuriat",
            "Développement personnel",
            "Poésie & Arts",
            "Biographies & Mémoires",
            "E-books Amazon KDP",
          ].map((genre, i) => (
            <span
              key={i}
              className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/80 dark:border-neutral-800 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:border-[#F4C5BC] hover:text-[#C84B31] transition-colors"
            >
              {genre}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
