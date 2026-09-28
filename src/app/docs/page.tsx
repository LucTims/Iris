import { Metadata } from "next";
import Link from "next/link";
import { Zap, Key, Code2, Bot, BookOpen } from "lucide-react";

export const metadata: Metadata = {
  title: "Introduction - Iris Docs",
  description: "Bienvenue sur Iris - La plateforme tout-en-un pour la co-création littéraire",
};

export default function DocsPage() {
  return (
    <div className="space-y-12">
      <header className="space-y-4">
        <p className="inline-flex items-center gap-1.5 text-[#C84B31] bg-[#C84B31]/10 px-3 py-1 rounded-full font-bold text-xs uppercase tracking-wider">
          <BookOpen className="w-3.5 h-3.5" />
          Introduction
        </p>
        <h1 className="font-heading text-4xl sm:text-5xl font-extrabold text-neutral-900 dark:text-neutral-100 tracking-tight">
          Bienvenue sur Iris
        </h1>
        <p className="text-lg text-neutral-600 dark:text-neutral-400 leading-relaxed border-b border-neutral-200/80 dark:border-neutral-800 pb-10">
          Iris est votre espace auteur de nouvelle génération. Rédigez, concevez et automatisez la création de vos livres, tout en gardant le contrôle absolu sur votre œuvre.
        </p>
      </header>

      <div className="space-y-10">
        <section className="space-y-4">
          <h2 className="text-2xl font-extrabold text-neutral-900 dark:text-neutral-100 font-heading">Qu'est-ce qu'Iris ?</h2>
          <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed text-lg">
            Iris est une plateforme puissante conçue spécifiquement pour les auteurs et créateurs 
            de contenu littéraire. Que vous écriviez un roman, structuriez vos chapitres ou gériez 
            la bible de vos personnages, Iris fournit tous les outils nécessaires pour gérer 
            votre projet de bout en bout, avec l'assistance discrète et puissante de l'IA (en option).
          </p>
        </section>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Link href="/docs" className="block p-6 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 hover:border-[#C84B31]/50 hover:bg-white dark:hover:bg-neutral-900 hover:shadow-lg transition-all group">
            <Zap className="w-8 h-8 text-[#C84B31] mb-4 opacity-80 group-hover:opacity-100 transition-opacity" strokeWidth={1.5} />
            <h4 className="font-extrabold text-neutral-900 dark:text-neutral-100 mb-2 font-heading text-lg">Démarrage rapide</h4>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Découvrez l'interface d'Iris et publiez votre premier chapitre en quelques minutes.
            </p>
          </Link>
          
          <Link href="/docs/api-keys" className="block p-6 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 hover:border-[#C84B31]/50 hover:bg-white dark:hover:bg-neutral-900 hover:shadow-lg transition-all group">
            <Key className="w-8 h-8 text-[#C84B31] mb-4 opacity-80 group-hover:opacity-100 transition-opacity" strokeWidth={1.5} />
            <h4 className="font-extrabold text-neutral-900 dark:text-neutral-100 mb-2 font-heading text-lg">Authentification</h4>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Gérez vos clés secrètes pour connecter Iris à des outils externes de façon sécurisée.
            </p>
          </Link>

          <Link href="/docs/automations" className="block p-6 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 hover:border-[#C84B31]/50 hover:bg-white dark:hover:bg-neutral-900 hover:shadow-lg transition-all group">
            <Code2 className="w-8 h-8 text-[#C84B31] mb-4 opacity-80 group-hover:opacity-100 transition-opacity" strokeWidth={1.5} />
            <h4 className="font-extrabold text-neutral-900 dark:text-neutral-100 mb-2 font-heading text-lg">Référence API</h4>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Explorez la documentation complète des endpoints de l'API REST d'Iris.
            </p>
          </Link>

          <Link href="/docs/automations" className="block p-6 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 hover:border-[#C84B31]/50 hover:bg-white dark:hover:bg-neutral-900 hover:shadow-lg transition-all group">
            <Bot className="w-8 h-8 text-[#C84B31] mb-4 opacity-80 group-hover:opacity-100 transition-opacity" strokeWidth={1.5} />
            <h4 className="font-extrabold text-neutral-900 dark:text-neutral-100 mb-2 font-heading text-lg">Intégration MCP</h4>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Pilotez l'écriture avec l'IA locale (Claude Desktop) via le Model Context Protocol.
            </p>
          </Link>
        </div>

        <section className="space-y-4 pt-8">
          <h2 className="text-2xl font-extrabold text-neutral-900 dark:text-neutral-100 font-heading border-b border-neutral-200/80 dark:border-neutral-800 pb-3">URL de base (Base URL)</h2>
          <p className="text-neutral-600 dark:text-neutral-400 text-lg">
            Toutes les requêtes API et connexions MCP externes doivent être dirigées vers :
          </p>
          <div className="relative group mt-4">
            <div className="absolute -inset-1 bg-gradient-to-r from-[#C84B31]/20 to-orange-400/20 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <pre className="relative bg-[#1E1E1E] text-neutral-100 p-6 rounded-2xl overflow-x-auto text-sm font-mono shadow-2xl border border-white/10">
              <code>https://irisboom.online/api/mcp</code>
            </pre>
          </div>
        </section>
      </div>
    </div>
  );
}
