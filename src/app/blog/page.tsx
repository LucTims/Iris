import Link from "next/link";
import Footer from "@/components/Footer";

export default function BlogPage() {
  const articles = [
    {
      title: "Comment écrire un eBook à succès avec l'IA en 7 jours",
      category: "Guide Rédaction",
      date: "18 Juillet 2026",
      readTime: "5 min de lecture",
      snippet: "Découvrez notre méthode étape par étape pour structurer vos connaissances et rédiger un livre numérique percutant sans jamais bloquer."
    },
    {
      title: "Vendre sur Amazon KDP : Le guide d'optimisation ultime",
      category: "Auto-édition",
      date: "12 Juillet 2026",
      readTime: "8 min de lecture",
      snippet: "Mots-clés, catégories, mise en page et visuels de couverture : toutes les clés pour maximiser la visibilité de votre ouvrage sur Kindle."
    },
    {
      title: "Les secrets des couvertures d'eBooks qui convertissent",
      category: "Design",
      date: "04 Juillet 2026",
      readTime: "4 min de lecture",
      snippet: "Analyse visuelle des meilleures ventes Amazon et conseils d'IA pour concevoir des visuels percutants qui incitent à l'achat immédiat."
    }
  ];

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
            <Link href="/blog" className="text-secondary font-bold">Blog</Link>
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

      <main className="pt-36 pb-20 max-w-7xl mx-auto px-6 w-full">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <span className="inline-block py-1.5 px-4 rounded-full bg-orange-50 border border-orange-200 text-secondary font-bold text-xs uppercase tracking-widest mb-4">
            LE BLOG IRIS
          </span>
          <h1 className="font-heading text-4xl sm:text-6xl font-extrabold text-neutral-900 tracking-tight mb-6">
            Conseils, guides & secrets d&apos;auto-édition
          </h1>
          <p className="text-lg text-neutral-600 leading-relaxed">
            Apprenez à mieux rédiger, concevoir et vendre vos livres numériques grâce à nos articles spécialisés.
          </p>
        </div>

        {/* Blog Posts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-20">
          {articles.map((art, idx) => (
            <article key={idx} className="bg-white rounded-3xl p-8 border border-neutral-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-neutral-400 mb-4">
                  <span className="text-secondary bg-orange-50 px-3 py-1 rounded-full">{art.category}</span>
                  <span>{art.readTime}</span>
                </div>
                <h3 className="font-heading text-xl font-bold text-neutral-900 mb-3 group-hover:text-secondary transition-colors">
                  {art.title}
                </h3>
                <p className="text-sm text-neutral-600 leading-relaxed mb-6">
                  {art.snippet}
                </p>
              </div>
              <div className="pt-4 border-t border-neutral-100 flex items-center justify-between text-xs font-bold text-neutral-500">
                <span>{art.date}</span>
                <span className="text-secondary flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Lire l&apos;article <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </span>
              </div>
            </article>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
