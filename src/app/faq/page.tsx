"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import AppLayout from "@/components/AppLayout";
import {
  Mail,
  Search,
  ChevronDown,
  ExternalLink,
  Sparkles,
  HelpCircle,
  Clock,
  ShieldCheck,
  Send,
  MessageSquare,
} from "lucide-react";

interface FAQItem {
  q: string;
  a: string;
  category: "Droits & Propriété" | "Rédaction & IA" | "Crédits & Tarifs" | "Exportation & Publication";
}

const FAQS: FAQItem[] = [
  {
    category: "Droits & Propriété",
    q: "Suis-je propriétaire à 100% des droits sur les livres générés ?",
    a: "Absolument. Vous conservez l'intégralité des droits d'auteur, de propriété intellectuelle et de commercialisation sur tous les textes, structures et visuels créés avec Iris. La plateforme n'exige aucune redevance (royalties) et ne revendique aucun droit sur vos œuvres publiées.",
  },
  {
    category: "Exportation & Publication",
    q: "Les livres sont-ils compatibles avec Amazon KDP et l'impression papier ?",
    a: "Oui, tous les fichiers exportés respectent strictement les normes techniques de l'édition. Le format EPUB est calibré pour Kindle, Kobo et Apple Books. Le format PDF haute définition intègre les marges éditeur, folios et sauts de page pour un rendu d'impression papier professionnel (KDP Broché, imprimerie locale, etc.).",
  },
  {
    category: "Crédits & Tarifs",
    q: "Comment fonctionne le portefeuille de pièces pour la rédaction ?",
    a: "Chaque génération de plan, de chapitre ou de couverture consomme un nombre déterminé de pièces selon le modèle d'IA sélectionné (modèle économique Gemini Flash ou modèle littéraire avancé GPT-4o / Claude). Les pièces achetées n'expirent jamais et sont débitées uniquement lors des actions de génération.",
  },
  {
    category: "Rédaction & IA",
    q: "Puis-je personnaliser le style littéraire et le ton de l'assistant ?",
    a: "Tout à fait ! Vous pouvez configurer le ton (narratif, académique, captivant, poétique, vulgarisateur), spécifier vos consignes d'auteur et interagir avec l'assistant au fil de chaque chapitre pour enrichir, développer ou reformuler les passages à votre convenance.",
  },
  {
    category: "Exportation & Publication",
    q: "Quels sont les formats d'exportation disponibles ?",
    a: "Iris vous permet d'exporter votre livre en un clic sous 3 formats essentiels : EPUB (pour les liseuses et boutiques d'eBooks), PDF Haute Résolution (pour l'impression physique et la lecture sur tablette) et DOCX Microsoft Word (pour conserver un fichier éditable sur votre ordinateur).",
  },
  {
    category: "Droits & Propriété",
    q: "Mes écrits et idées sont-ils protégés et confidentiels ?",
    a: "La confidentialité de vos créations est notre priorité absolue. Vos manuscrits ne sont ni partagés publiquement, ni utilisés pour entraîner des modèles d'intelligence artificielle ouverts. Vous demeurez le seul maître de vos contenus.",
  },
  {
    category: "Rédaction & IA",
    q: "Comment concevoir une couverture professionnelle pour mon livre ?",
    a: "Iris intègre un Studio de Couverture dédié qui vous permet de concevoir des maquettes de première de couverture de qualité professionnelle, parfaitement dimensionnées pour les boutiques d'ebooks et les formats de poche imprimés.",
  },
];

const CATEGORIES = [
  "Toutes",
  "Droits & Propriété",
  "Rédaction & IA",
  "Crédits & Tarifs",
  "Exportation & Publication",
] as const;

export default function FAQPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Toutes");
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const filteredFaqs = useMemo(() => {
    return FAQS.filter((faq) => {
      const matchesCategory =
        selectedCategory === "Toutes" || faq.category === selectedCategory;
      const matchesQuery =
        faq.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.a.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [searchQuery, selectedCategory]);

  const toggleAccordion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <AppLayout>
      <main className="p-4 sm:p-6 md:p-10 max-w-6xl mx-auto w-full space-y-12">
        
        {/* ========================================================= */}
        {/* EN-TÊTE PRINCIPAL */}
        {/* ========================================================= */}
        <div className="text-center max-w-3xl mx-auto pt-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FDF3F1] border border-[#F4C5BC]/70 text-[#C84B31] text-xs font-semibold mb-4 shadow-2xs">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Centre d&apos;aide &amp; Support Iris</span>
          </div>

          <h1 className="font-heading font-extrabold text-3xl sm:text-4xl lg:text-5xl text-neutral-900 tracking-tight leading-tight mb-4">
            Comment pouvons-nous <br className="hidden sm:inline" />
            <span className="text-[#C84B31]">vous aider aujourd&apos;hui ?</span>
          </h1>

          <p className="text-sm sm:text-base text-neutral-600 leading-relaxed max-w-2xl mx-auto">
            Contactez directement notre équipe pour une assistance personnalisée ou consultez les réponses aux questions fréquentes sur la rédaction et l&apos;édition.
          </p>
        </div>

        {/* ========================================================= */}
        {/* SECTION 1 : CANAUX DE CONTACT DIRECTS (EN HAUT) */}
        {/* ========================================================= */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-neutral-200/80 pb-3">
            <div>
              <h2 className="font-heading font-bold text-xl sm:text-2xl text-neutral-900">
                Nous contacter directement
              </h2>
              <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
                Choisissez le canal qui vous convient le mieux pour échanger avec notre équipe
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/60 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
              <span>Support actif</span>
            </div>
          </div>

          {/* Grille des canaux prioritaires (Email + WhatsApp) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            
            {/* Carte Email Officiel */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-neutral-200/90 shadow-2xs hover:border-[#F4C5BC] hover:shadow-md transition-all flex flex-col justify-between group">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-[#FDF3F1] border border-[#F4C5BC]/60 flex items-center justify-center text-[#C84B31]">
                    <Mail className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-semibold text-neutral-500 bg-neutral-100 px-2.5 py-1 rounded-full flex items-center gap-1">
                    <Clock className="w-3 h-3 text-neutral-400" />
                    <span>Réponse sous 24h</span>
                  </span>
                </div>

                <div>
                  <h3 className="font-heading font-bold text-lg text-neutral-900 group-hover:text-[#C84B31] transition-colors">
                    Support par Email
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-500 mt-1 leading-relaxed">
                    Pour toute question relative à votre compte, vos manuscrits ou un partenariat.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/70 font-mono text-xs text-neutral-800 break-all select-all font-semibold">
                  irisboom100@gmail.com
                </div>
              </div>

              <div className="pt-5 mt-3 border-t border-neutral-100">
                <a
                  href="mailto:irisboom100@gmail.com?subject=Question%20concernant%20Iris"
                  className="w-full inline-flex items-center justify-center gap-2 bg-[#C84B31] hover:bg-[#B83E26] text-white text-xs sm:text-sm font-semibold px-5 py-3 rounded-xl transition-all shadow-2xs hover:shadow-xs cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Envoyer un email</span>
                </a>
              </div>
            </div>

            {/* Carte WhatsApp Direct */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-neutral-200/90 shadow-2xs hover:border-emerald-300 hover:shadow-md transition-all flex flex-col justify-between group">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200/70 flex items-center justify-center text-emerald-600">
                    <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                    </svg>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/60">
                    Direct &amp; Instantané
                  </span>
                </div>

                <div>
                  <h3 className="font-heading font-bold text-lg text-neutral-900 group-hover:text-emerald-700 transition-colors">
                    WhatsApp Iris
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-500 mt-1 leading-relaxed">
                    Posez vos questions en direct à notre service d&apos;assistance via message WhatsApp.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200/60 text-xs text-emerald-900 font-medium">
                  Discussion directe avec l&apos;équipe éditoriale &amp; technique
                </div>
              </div>

              <div className="pt-5 mt-3 border-t border-neutral-100">
                <a
                  href="https://wa.me/?text=Bonjour%20Iris,%20j'ai%20une%20question%20concernant%20la%20plateforme."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold px-5 py-3 rounded-xl transition-all shadow-2xs hover:shadow-xs cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Ouvrir une discussion WhatsApp</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                </a>
              </div>
            </div>

          </div>

          {/* Grille des Réseaux Sociaux (Facebook, YouTube, TikTok) */}
          <div>
            <div className="mb-3">
              <h3 className="font-heading font-bold text-base text-neutral-900">
                Rejoignez notre communauté sur les réseaux sociaux
              </h3>
              <p className="text-xs text-neutral-500">
                Suivez nos tutoriels vidéo, conseils d&apos;écriture et actualités littéraires
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              
              {/* Facebook */}
              <a
                href="https://facebook.com/irisboom"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white rounded-2xl p-4.5 border border-neutral-200/80 shadow-2xs hover:border-blue-300 hover:shadow-sm transition-all flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-heading font-bold text-sm text-neutral-900 group-hover:text-blue-600 transition-colors">
                      Facebook
                    </h4>
                    <span className="text-[11px] text-neutral-500 block">Actualités &amp; Événements</span>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-neutral-400 group-hover:text-blue-600 transition-colors" />
              </a>

              {/* YouTube */}
              <a
                href="https://youtube.com/@irisboom"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white rounded-2xl p-4.5 border border-neutral-200/80 shadow-2xs hover:border-red-300 hover:shadow-sm transition-all flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600">
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-heading font-bold text-sm text-neutral-900 group-hover:text-red-600 transition-colors">
                      YouTube
                    </h4>
                    <span className="text-[11px] text-neutral-500 block">Tutos &amp; Démos vidéo</span>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-neutral-400 group-hover:text-red-600 transition-colors" />
              </a>

              {/* TikTok */}
              <a
                href="https://tiktok.com/@irisboom"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white rounded-2xl p-4.5 border border-neutral-200/80 shadow-2xs hover:border-neutral-400 hover:shadow-sm transition-all flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-900">
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-1.01-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-heading font-bold text-sm text-neutral-900 group-hover:text-[#C84B31] transition-colors">
                      TikTok
                    </h4>
                    <span className="text-[11px] text-neutral-500 block">Astuces d&apos;écriture IA</span>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-neutral-400 group-hover:text-neutral-900 transition-colors" />
              </a>

            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 2 : FOIRE AUX QUESTIONS (EN BAS) */}
        {/* ========================================================= */}
        <section className="space-y-6 pt-4">
          <div className="border-b border-neutral-200/80 pb-3">
            <h2 className="font-heading font-bold text-xl sm:text-2xl text-neutral-900">
              Foire Aux Questions
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
              Trouvez des réponses immédiates aux questions les plus récurrentes
            </p>
          </div>

          {/* Barre de recherche rapide & filtres */}
          <div className="space-y-4">
            {/* Input recherche */}
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher par mot-clé (ex: KDP, droits, PDF, pièces, style...)"
                className="w-full bg-white border border-neutral-200 rounded-2xl pl-11 pr-4 py-3 text-xs sm:text-sm font-medium text-neutral-800 focus:border-[#C84B31] focus:ring-2 focus:ring-[#C84B31]/15 outline-none transition-all shadow-2xs"
              />
            </div>

            {/* Filtres par catégories */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? "bg-[#C84B31] text-white shadow-2xs"
                      : "bg-white border border-neutral-200/80 text-neutral-600 hover:text-neutral-900 hover:border-neutral-300"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Liste des Questions / Réponses en Accordéon */}
          <div className="space-y-3">
            {filteredFaqs.length === 0 ? (
              <div className="bg-white rounded-2xl border border-neutral-200/80 p-8 text-center space-y-2">
                <p className="text-sm font-semibold text-neutral-700">
                  Aucune question ne correspond à votre recherche « {searchQuery} ».
                </p>
                <p className="text-xs text-neutral-500">
                  Essayez un autre mot-clé ou contactez-nous directement par email à{" "}
                  <a href="mailto:irisboom100@gmail.com" className="text-[#C84B31] underline font-semibold">
                    irisboom100@gmail.com
                  </a>.
                </p>
              </div>
            ) : (
              filteredFaqs.map((faq, idx) => {
                const isOpen = openIndex === idx;
                return (
                  <div
                    key={idx}
                    className="bg-white rounded-2xl border border-neutral-200/80 overflow-hidden shadow-2xs hover:border-[#F4C5BC]/80 transition-colors"
                  >
                    <button
                      onClick={() => toggleAccordion(idx)}
                      className="w-full p-5 text-left flex items-start justify-between gap-4 cursor-pointer"
                    >
                      <div className="space-y-1 pr-2">
                        <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-[#C84B31] bg-[#FDF3F1] px-2 py-0.5 rounded">
                          {faq.category}
                        </span>
                        <h3 className="font-heading font-bold text-sm sm:text-base text-neutral-900">
                          {faq.q}
                        </h3>
                      </div>

                      <div
                        className={`w-7 h-7 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500 shrink-0 transition-transform duration-200 mt-0.5 ${
                          isOpen ? "rotate-180 bg-[#FDF3F1] text-[#C84B31]" : ""
                        }`}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </button>

                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-neutral-600 leading-relaxed border-t border-neutral-100">
                            {faq.a}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* ========================================================= */}
        {/* BANDEAU DE RÉASSURANCE EN BAS */}
        {/* ========================================================= */}
        <div className="bg-gradient-to-br from-[#FAF7F5] to-white border border-[#F4C5BC]/70 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xs">
          <div className="space-y-1 text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#C84B31]">
              <ShieldCheck className="w-4 h-4" />
              <span>Engagement Qualité Iris</span>
            </div>
            <h4 className="font-heading font-bold text-lg text-neutral-900">
              Prêt à commencer la rédaction de votre manuscrit ?
            </h4>
            <p className="text-xs sm:text-sm text-neutral-500">
              Transformez votre expertise en livre numérique prêt pour Amazon KDP et l&apos;impression papier.
            </p>
          </div>

          <Link href="/projects/new" className="shrink-0 w-full sm:w-auto">
            <button className="w-full sm:w-auto bg-[#C84B31] hover:bg-[#B83E26] text-white text-xs sm:text-sm font-semibold px-6 py-3 rounded-xl transition-all shadow-2xs hover:shadow-xs flex items-center justify-center gap-2 cursor-pointer">
              <span>Créer mon livre maintenant</span>
              <Sparkles className="w-4 h-4" />
            </button>
          </Link>
        </div>

      </main>
    </AppLayout>
  );
}
