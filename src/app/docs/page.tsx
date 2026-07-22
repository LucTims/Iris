import Link from "next/link";
import Footer from "@/components/Footer";

export default function DocsPage() {
  const sections = [
    {
      title: "Prise en main rapide",
      items: [
        "Créer son premier projet de livre",
        "Configurer les paramètres de l'assistant Iris",
        "Importer ou générer une table des matières",
        "Exportation et téléchargement des fichiers"
      ]
    },
    {
      title: "Publication & Formatage",
      items: [
        "Guide d'exportation Amazon KDP (Mobi / EPUB)",
        "Dimensions et résolution pour couverture HD",
        "Gestion des droits d'auteur et ISBN",
        "Mise en page automatique des chapitres"
      ]
    },
    {
      title: "Assistant IA & Prompts",
      items: [
        "Comment guider Iris pour adopter votre ton",
        "Rédiger des récits et études de cas captivants",
        "Ajuster la longueur et le style des réponses",
        "Résolution des erreurs de génération"
      ]
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
            <Link href="/blog" className="hover:text-secondary transition-colors">Blog</Link>
            <Link href="/docs" className="text-secondary font-bold">Documentation</Link>
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
            CENTRE DE DOCUMENTATION
          </span>
          <h1 className="font-heading text-4xl sm:text-6xl font-extrabold text-neutral-900 tracking-tight mb-6">
            Guides & Manuels d&apos;utilisation d&apos;Iris
          </h1>
          <p className="text-lg text-neutral-600 leading-relaxed">
            Trouvez les réponses techniques et tutoriels pas-à-pas pour exploiter 100% du potentiel d&apos;Iris Studio.
          </p>
        </div>

        {/* Search Input Fake */}
        <div className="max-w-2xl mx-auto mb-16">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 text-xl">
              search
            </span>
            <input 
              type="text" 
              placeholder="Rechercher un tutoriel, une fonctionnalité ou un problème..." 
              className="w-full bg-neutral-50 border border-neutral-300 rounded-2xl pl-12 pr-4 py-4 text-sm font-medium text-neutral-900 focus:outline-none focus:border-secondary focus:bg-white transition-all shadow-xs"
            />
          </div>
        </div>

        {/* Documentation Sections */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-20">
          {sections.map((sec, idx) => (
            <div key={idx} className="bg-white rounded-3xl p-8 border border-neutral-200 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="font-heading text-xl font-bold text-neutral-900 mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary">description</span>
                  <span>{sec.title}</span>
                </h3>
                <ul className="space-y-3 text-sm text-neutral-700">
                  {sec.items.map((item, i) => (
                    <li key={i} className="flex items-center gap-2 hover:text-secondary cursor-pointer transition-colors">
                      <span className="material-symbols-outlined text-neutral-400 text-sm">chevron_right</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
