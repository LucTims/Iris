import { Metadata } from "next";
import Link from "next/link";
import { Zap, Key, Code2, Bot } from "lucide-react";

export const metadata: Metadata = {
  title: "Introduction - Iris Docs",
  description: "Bienvenue sur Iris - La plateforme tout-en-un pour la co-création littéraire",
};

export default function DocsPage() {
  return (
    <div className="space-y-10">
      <header className="space-y-4">
        <p className="text-[#C84B31] font-semibold text-sm">Introduction</p>
        <h1 className="font-heading text-4xl sm:text-5xl font-extrabold text-neutral-900 tracking-tight">
          Introduction
        </h1>
        <p className="text-lg text-neutral-600 leading-relaxed border-b border-neutral-200 pb-8">
          Bienvenue sur Iris - La plateforme tout-en-un pour la co-création littéraire
        </p>
      </header>

      <div className="space-y-8">
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-neutral-900 font-heading">Qu'est-ce qu'Iris ?</h2>
          <p className="text-neutral-600 leading-relaxed">
            Iris est une plateforme puissante conçue spécifiquement pour les auteurs et créateurs 
            de contenu littéraire. Que vous écriviez un roman, structuriez vos chapitres ou gériez 
            la bible de vos personnages, Iris fournit tous les outils nécessaires pour gérer 
            votre projet de bout en bout, avec l'assistance discrète et puissante de l'IA.
          </p>
        </section>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Link href="/docs" className="block p-6 rounded-2xl border border-neutral-200 bg-white hover:border-[#C84B31]/50 hover:shadow-md transition-all group">
            <Zap className="w-8 h-8 text-[#C84B31] mb-4" strokeWidth={1.5} />
            <h4 className="font-bold text-neutral-900 mb-2 font-heading">Démarrage rapide</h4>
            <p className="text-sm text-neutral-500">
              Configurez et lancez vos requêtes API Iris en quelques minutes
            </p>
          </Link>
          
          <Link href="/docs/api-keys" className="block p-6 rounded-2xl border border-neutral-200 bg-white hover:border-[#C84B31]/50 hover:shadow-md transition-all group">
            <Key className="w-8 h-8 text-[#C84B31] mb-4" strokeWidth={1.5} />
            <h4 className="font-bold text-neutral-900 mb-2 font-heading">Authentification</h4>
            <p className="text-sm text-neutral-500">
              Découvrez comment authentifier vos requêtes vers l'API d'Iris
            </p>
          </Link>

          <Link href="/docs/automations" className="block p-6 rounded-2xl border border-neutral-200 bg-white hover:border-[#C84B31]/50 hover:shadow-md transition-all group">
            <Code2 className="w-8 h-8 text-[#C84B31] mb-4" strokeWidth={1.5} />
            <h4 className="font-bold text-neutral-900 mb-2 font-heading">Référence API</h4>
            <p className="text-sm text-neutral-500">
              Explorez la documentation complète des endpoints de l'API
            </p>
          </Link>

          <Link href="/docs/automations" className="block p-6 rounded-2xl border border-neutral-200 bg-white hover:border-[#C84B31]/50 hover:shadow-md transition-all group">
            <Bot className="w-8 h-8 text-[#C84B31] mb-4" strokeWidth={1.5} />
            <h4 className="font-bold text-neutral-900 mb-2 font-heading">Intégration MCP</h4>
            <p className="text-sm text-neutral-500">
              Connectez Iris à vos assistants IA locaux via le Model Context Protocol
            </p>
          </Link>
        </div>

        <section className="space-y-4 pt-6">
          <h2 className="text-2xl font-bold text-neutral-900 font-heading border-b border-neutral-200 pb-2">URL de base (Base URL)</h2>
          <p className="text-neutral-600">
            Toutes les requêtes API et connexions MCP doivent être effectuées vers :
          </p>
          <pre className="bg-neutral-900 text-neutral-100 p-4 rounded-xl overflow-x-auto text-sm font-mono shadow-inner">
            <code>https://api.irisboom.online/v1</code>
          </pre>
        </section>
      </div>
    </div>
  );
}
