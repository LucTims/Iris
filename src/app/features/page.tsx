import Link from "next/link";
import Footer from "@/components/Footer";

export default function FeaturesPage() {
  const features = [
    {
      title: "Co-rédaction interactive IA",
      description: "Discutez en temps réel avec Iris pour enrichir vos paragraphes, ajuster le ton et développer des arguments percutants.",
      icon: "auto_awesome"
    },
    {
      title: "Génération de plan structuré",
      description: "Transformez une simple idée en une table des matières complète avec des chapitres équilibrés et captivants.",
      icon: "account_tree"
    },
    {
      title: "Design de couverture IA HD",
      description: "Créez des visuels de couverture spectaculaires qui attirent immédiatement l'œil sur Amazon et les boutiques d'eBooks.",
      icon: "palette"
    },
    {
      title: "Formatage automatique Amazon KDP",
      description: "Bénéficiez d'une mise en page professionnelle respectant scrupuleusement les exigences des plateformes d'auto-édition.",
      icon: "verified"
    },
    {
      title: "Export multi-formats (PDF & EPUB)",
      description: "Téléchargez vos fichiers d'un seul clic, prêts à être envoyés sur vos liseuses ou mis en vente en ligne.",
      icon: "file_download"
    },
    {
      title: "Correction & Style Littéraire",
      description: "Éliminez les coquilles, améliorez la fluidité et peaufinez le vocabulaire grâce au moteur d'analyse sémantique d'Iris.",
      icon: "spellcheck"
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
            <Link href="/features" className="text-secondary font-bold">Fonctionnalités</Link>
            <Link href="/how-it-works" className="hover:text-secondary transition-colors">Comment ça marche</Link>
            <Link href="/pricing" className="hover:text-secondary transition-colors">Tarifs</Link>
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

      <main className="pt-36 pb-20 max-w-7xl mx-auto px-6 w-full">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <span className="inline-block py-1.5 px-4 rounded-full bg-orange-50 border border-orange-200 text-secondary font-bold text-xs uppercase tracking-widest mb-4">
            TOUTES LES FONCTIONNALITÉS
          </span>
          <h1 className="font-heading text-4xl sm:text-6xl font-extrabold text-neutral-900 tracking-tight mb-6">
            Tout ce dont vous avez besoin pour concevoir votre livre
          </h1>
          <p className="text-lg text-neutral-600 leading-relaxed">
            Iris intègre tous les outils nécessaires à la rédaction, au design et à la publication numérique au même endroit.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-20">
          {features.map((feat, idx) => (
            <div key={idx} className="bg-white rounded-3xl p-8 border border-neutral-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-orange-100 text-secondary flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined text-2xl">{feat.icon}</span>
                </div>
                <h3 className="font-heading text-xl font-bold text-neutral-900 mb-3">{feat.title}</h3>
                <p className="text-sm text-neutral-600 leading-relaxed">{feat.description}</p>
              </div>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
