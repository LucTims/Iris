import Link from "next/link";
import Footer from "@/components/Footer";

export default function TermsPage() {
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
            <Link href="/pricing" className="hover:text-secondary transition-colors">Tarifs</Link>
            <Link href="/terms" className="text-secondary font-bold">Conditions</Link>
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

      <main className="pt-36 pb-20 max-w-4xl mx-auto px-6 w-full">
        <h1 className="font-heading text-4xl sm:text-5xl font-extrabold text-neutral-900 tracking-tight mb-8">
          Conditions Générales d&apos;Utilisation
        </h1>

        <div className="bg-neutral-50 rounded-3xl p-8 md:p-12 border border-neutral-200/80 space-y-6 text-neutral-700 text-sm leading-relaxed">
          <p>Dernière mise à jour : 22 Juillet 2026</p>
          <h2 className="font-heading text-xl font-bold text-neutral-900 pt-4">1. Acceptation des Conditions</h2>
          <p>
            En accédant et en utilisant le service Iris édité par BoomBooks, vous acceptez sans réserve les présentes conditions d&apos;utilisation.
          </p>

          <h2 className="font-heading text-xl font-bold text-neutral-900 pt-4">2. Utilisation du Service</h2>
          <p>
            L&apos;utilisateur s&apos;engage à utiliser Iris dans le respect des lois en vigueur et à ne pas générer de contenus diffamatoires ou illégaux.
          </p>

          <h2 className="font-heading text-xl font-bold text-neutral-900 pt-4">3. Abonnements et Résiliation</h2>
          <p>
            Les abonnements peuvent être résiliés à tout moment depuis votre tableau de bord sans aucun frais supplémentaire.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
