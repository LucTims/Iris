import Link from "next/link";
import Footer from "@/components/Footer";

export default function AboutPage() {
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
            <Link href="/about" className="text-secondary font-bold">À propos</Link>
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

      <main className="pt-36 pb-20 max-w-7xl mx-auto px-6 w-full">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <span className="inline-block py-1.5 px-4 rounded-full bg-orange-50 border border-orange-200 text-secondary font-bold text-xs uppercase tracking-widest mb-4">
            À PROPOS DE BOOM
          </span>
          <h1 className="font-heading text-4xl sm:text-6xl font-extrabold text-neutral-900 tracking-tight mb-6">
            Démocratiser l&apos;écriture et l&apos;auto-édition par l&apos;IA
          </h1>
          <p className="text-lg text-neutral-600 leading-relaxed">
            Boom est l&apos;entreprise technologique qui conçoit Iris, la première solution de co-création littéraire dédiée aux créateurs, entrepreneurs et passionnés.
          </p>
        </div>

        <div className="max-w-4xl mx-auto bg-neutral-50 rounded-3xl p-10 md:p-14 border border-neutral-200/80 mb-20 space-y-6 text-neutral-700 leading-relaxed text-base">
          <h2 className="font-heading text-2xl font-bold text-neutral-900">Notre Mission</h2>
          <p>
            Nous sommes convaincus que chaque personne possède une expertise, une histoire ou un savoir unique qui mérite d&apos;être transmis. Cependant, la rédaction d&apos;un ouvrage complet et les contraintes techniques de mise en page découragent la grande majorité des auteurs.
          </p>
          <p>
            C&apos;est pour résoudre ce problème que nous avons développé <strong>Iris</strong> : une intelligence artificielle compagnon qui agit comme un co-auteur et un designer personnel. Vous apportez vos idées et vos connaissances, Iris prend en charge la rédaction, le style et le formatage.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
