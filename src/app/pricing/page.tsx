import Link from "next/link";
import Footer from "@/components/Footer";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white font-body text-neutral-900 flex flex-col justify-between">
      {/* Header / Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-neutral-200/80">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="font-heading font-extrabold text-3xl md:text-4xl text-neutral-900 tracking-tight">
            Iris
          </Link>

          <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-neutral-700">
            <Link href="/features" className="hover:text-secondary transition-colors">Fonctionnalités</Link>
            <Link href="/how-it-works" className="hover:text-secondary transition-colors">Comment ça marche</Link>
            <Link href="/pricing" className="text-secondary font-bold">Tarifs</Link>
            <Link href="/blog" className="hover:text-secondary transition-colors">Blog</Link>
            <Link href="/docs" className="hover:text-secondary transition-colors">Documentation</Link>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-semibold text-neutral-700 hover:text-neutral-900 hidden sm:block">
              Se connecter
            </Link>
            <Link href="/register">
              <button className="bg-secondary hover:bg-orange-600 text-white px-5 py-2.5 rounded-full text-sm font-bold transition-all shadow-sm">
                Commencer gratuitement →
              </button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-36 pb-20 max-w-7xl mx-auto px-6 w-full">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block py-1.5 px-4 rounded-full bg-orange-50 border border-orange-200 text-secondary font-bold text-xs uppercase tracking-widest mb-4">
            TARIFS & ABONNEMENTS
          </span>
          <h1 className="font-heading text-4xl sm:text-6xl font-extrabold text-neutral-900 tracking-tight mb-4">
            Des tarifs transparents pour chaque auteur
          </h1>
          <p className="text-lg text-neutral-600">
            Que vous rédigiez votre premier guide ou une série complète d&apos;eBooks, choisissez le plan adapté à vos ambitions.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-20">
          
          {/* Starter Plan */}
          <div className="bg-white rounded-3xl border border-neutral-200 p-8 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Gratuit</span>
              <h3 className="font-heading text-2xl font-bold text-neutral-900 mt-1 mb-2">Découverte</h3>
              <p className="text-sm text-neutral-500 mb-6">Pour tester Iris et rédiger vos premiers chapitres.</p>
              <div className="mb-8">
                <span className="text-4xl font-extrabold text-neutral-900">0 FCFA</span>
                <span className="text-neutral-500 font-medium"> /mois</span>
              </div>

              <ul className="space-y-3 text-sm text-neutral-700 mb-8">
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-500 text-lg">check_circle</span>
                  <span>1 projet de livre actif</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-500 text-lg">check_circle</span>
                  <span>5 000 mots générés / mois</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-500 text-lg">check_circle</span>
                  <span>Export texte & structuration IA</span>
                </li>
              </ul>
            </div>

            <Link href="/register">
              <button className="w-full bg-neutral-100 hover:bg-neutral-200 text-neutral-900 font-bold py-3.5 rounded-2xl transition-colors">
                Commencer gratuitement
              </button>
            </Link>
          </div>

          {/* Pro Plan */}
          <div className="bg-neutral-900 text-white rounded-3xl p-8 shadow-xl relative overflow-hidden flex flex-col justify-between border-2 border-neutral-900">
            <div className="absolute top-4 right-4 bg-secondary text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              Populaire
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-orange-400">Pour créateurs</span>
              <h3 className="font-heading text-2xl font-bold text-white mt-1 mb-2">Auteur Pro</h3>
              <p className="text-sm text-neutral-400 mb-6">Pour publier des livres complets prêts pour Amazon KDP.</p>
              <div className="mb-8">
                <span className="text-4xl font-extrabold text-white">4 900 FCFA</span>
                <span className="text-neutral-400 font-medium"> /mois</span>
              </div>

              <ul className="space-y-3 text-sm text-neutral-200 mb-8">
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-lg">check_circle</span>
                  <span>Projets illimités</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-lg">check_circle</span>
                  <span>Mots illimités avec l&apos;IA Iris</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-lg">check_circle</span>
                  <span>Génération de couvertures HD par IA</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-lg">check_circle</span>
                  <span>Export PDF & EPUB prêt à vendre</span>
                </li>
              </ul>
            </div>

            <Link href="/register">
              <button className="w-full bg-secondary hover:bg-orange-600 text-white font-bold py-3.5 rounded-2xl transition-colors shadow-lg">
                Démarrer mon essai Pro
              </button>
            </Link>
          </div>

          {/* Enterprise / Team Plan */}
          <div className="bg-white rounded-3xl border border-neutral-200 p-8 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Maison d&apos;Édition</span>
              <h3 className="font-heading text-2xl font-bold text-neutral-900 mt-1 mb-2">Studio & Éditeur</h3>
              <p className="text-sm text-neutral-500 mb-6">Pour les équipes et maisons d&apos;édition digitales.</p>
              <div className="mb-8">
                <span className="text-4xl font-extrabold text-neutral-900">14 900 FCFA</span>
                <span className="text-neutral-500 font-medium"> /mois</span>
              </div>

              <ul className="space-y-3 text-sm text-neutral-700 mb-8">
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-500 text-lg">check_circle</span>
                  <span>Tout ce qu&apos;il y a dans Auteur Pro</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-500 text-lg">check_circle</span>
                  <span>5 sièges utilisateurs / collaborateurs</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-500 text-lg">check_circle</span>
                  <span>Support prioritaire 24/7 & Formats personnalisés</span>
                </li>
              </ul>
            </div>

            <Link href="/contact">
              <button className="w-full bg-neutral-900 hover:bg-black text-white font-bold py-3.5 rounded-2xl transition-colors">
                Contacter l&apos;équipe
              </button>
            </Link>
          </div>

        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
