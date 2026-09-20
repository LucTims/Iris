import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Documentation & API - Iris",
  description: "Découvrez comment intégrer et automatiser la création de vos livres avec Iris.",
};

export default function DocsPage() {
  return (
    <div className="space-y-10">
      <header className="space-y-4">
        <div className="inline-flex items-center justify-center mb-2">
          <div className="bg-[#FDF3F1] dark:bg-[#FDF3F1]/10 text-[#C84B31] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest">
            Accueil Docs
          </div>
        </div>
        <h1 className="font-heading text-4xl sm:text-5xl font-extrabold text-neutral-900 dark:text-neutral-100 tracking-tight">
          Introduction à l'écosystème Iris
        </h1>
        <p className="text-lg sm:text-xl text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-2xl">
          Découvrez comment étendre les capacités d'Iris, automatiser vos flux de travail et intégrer vos propres assistants IA grâce au protocole MCP.
        </p>
      </header>

      <div className="prose prose-neutral dark:prose-invert max-w-none">
        <p>
          Bienvenue dans la documentation officielle développeur d'Iris. Bien qu'Iris ait été conçu comme
          une plateforme clé en main pour la co-création littéraire, nous offrons une ouverture 
          complète pour les auteurs techniques et les créateurs qui souhaitent intégrer leur propre écosystème.
        </p>

        <h3 className="font-heading text-2xl font-bold mt-10 mb-4">Ce que vous pouvez faire</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 not-prose">
          <a href="/docs/automations" className="block p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 hover:border-[#C84B31]/50 transition-colors group">
            <h4 className="font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-[#C84B31]">smart_toy</span>
              Intégration IA (MCP)
            </h4>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Connectez Claude Desktop, Cursor, ou votre propre agent IA directement à vos manuscrits via le Model Context Protocol.
            </p>
          </a>
          
          <a href="/docs/api-keys" className="block p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 hover:border-[#C84B31]/50 transition-colors group">
            <h4 className="font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-[#C84B31]">vpn_key</span>
              Clés d'API
            </h4>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Gérez vos clés secrètes pour un accès sécurisé de bout en bout à vos œuvres et projets.
            </p>
          </a>
        </div>

        <h3 className="font-heading text-2xl font-bold mt-12 mb-4">Sécurité "Privacy by Design"</h3>
        <p>
          L'intégralité de nos API de documentation et protocoles s'appuie sur la même 
          architecture stricte que notre interface publique. Vos œuvres vous appartiennent, 
          et l'accès programmatique via nos protocoles requiert une authentification explicite.
        </p>
        <p>
          Consultez notre <a href="/privacy" className="text-[#C84B31] font-bold underline">Politique de sécurité</a> pour 
          comprendre comment notre infrastructure cloud protège vos chapitres et données sensibles.
        </p>
      </div>
    </div>
  );
}
