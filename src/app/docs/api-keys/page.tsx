import { Metadata } from "next";
import { KeyRound, ShieldAlert } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Authentification & Clés d'API - Iris Docs",
  description: "Gérer vos clés d'API Iris pour vos automatisations.",
};

export default function ApiKeysDocsPage() {
  return (
    <div className="space-y-12">
      <header className="space-y-4">
        <p className="inline-flex items-center gap-1.5 text-[#C84B31] bg-[#C84B31]/10 px-3 py-1 rounded-full font-bold text-xs uppercase tracking-wider">
          <KeyRound className="w-3.5 h-3.5" />
          Authentification
        </p>
        <h1 className="font-heading text-4xl sm:text-5xl font-extrabold text-neutral-900 dark:text-neutral-100 tracking-tight">
          Clés d'API & Sécurité
        </h1>
        <p className="text-lg text-neutral-600 dark:text-neutral-400 leading-relaxed border-b border-neutral-200/80 dark:border-neutral-800 pb-10">
          Découvrez comment générer et utiliser vos clés secrètes pour sécuriser l'accès à vos manuscrits via des outils externes ou l'API REST.
        </p>
      </header>

      <div className="prose prose-neutral dark:prose-invert max-w-none prose-headings:font-heading prose-headings:font-extrabold prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-4 prose-p:text-neutral-600 dark:prose-p:text-neutral-400 prose-p:leading-relaxed prose-a:text-[#C84B31] hover:prose-a:text-[#B83E26] prose-strong:text-neutral-900 dark:prose-strong:text-neutral-100">
        <p>
          Pour interagir avec l'API d'Iris ou configurer le serveur <strong>MCP</strong> (Model Context Protocol), vous devez vous authentifier à 
          l'aide d'une clé d'API. Ces clés sont strictement confidentielles et accordent les pleins droits sur votre espace de travail.
        </p>

        <h3>Générer une clé d'API</h3>
        <p>
          Rendez-vous dans la section <Link href="/automations" target="_blank" rel="noopener noreferrer" className="font-semibold underline decoration-[#C84B31]/30 underline-offset-4 hover:decoration-[#C84B31]">Automatisations</Link> de 
          votre tableau de bord Iris. Cliquez sur "Générer une clé API". 
        </p>
        
        <div className="bg-amber-50 dark:bg-amber-500/10 border-l-4 border-amber-500 p-6 rounded-r-2xl my-8 shadow-sm flex gap-4 items-start">
          <ShieldAlert className="w-6 h-6 text-amber-600 dark:text-amber-500 shrink-0" />
          <div>
            <h4 className="font-bold font-heading text-amber-800 dark:text-amber-500 text-lg m-0 mb-2">Attention : Affichage unique</h4>
            <p className="text-sm text-amber-900/80 dark:text-amber-200/80 m-0 leading-relaxed">
              Pour des raisons de sécurité critiques, votre clé secrète n'est affichée qu'une seule fois, au moment de sa création. 
              Iris ne stocke qu'une empreinte chiffrée (hash) dans la base de données. Si vous la perdez, vous devrez la révoquer et en générer une nouvelle.
            </p>
          </div>
        </div>

        <h3>Utiliser votre clé dans une requête REST</h3>
        <p>
          Toutes les requêtes API (hors MCP) doivent inclure l'en-tête standard HTTP <code>Authorization</code> :
        </p>
        
        <div className="relative group mt-6 mb-8">
          <div className="absolute -inset-1 bg-gradient-to-r from-[#C84B31]/20 to-orange-400/20 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
          <pre className="relative bg-[#1E1E1E] text-neutral-100 p-6 rounded-2xl overflow-x-auto text-sm font-mono leading-relaxed border border-white/10 shadow-2xl">
{`Authorization: Bearer lg_votre_cle_api_secrete_ici`}
          </pre>
        </div>
        
        <p>
          Si vous utilisez notre serveur MCP (intégré avec Claude Desktop par exemple), vous devez l'intégrer directement dans les variables 
          d'environnement sous le nom <code>IRIS_API_KEY</code> de votre client MCP.
        </p>
      </div>
    </div>
  );
}
