import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Authentification & Clés d'API - Iris Docs",
  description: "Gérer vos clés d'API Iris pour vos automatisations.",
};

export default function ApiKeysDocsPage() {
  return (
    <div className="space-y-10">
      <header className="space-y-4">
        <p className="text-[#C84B31] font-semibold text-sm">Authentification</p>
        <h1 className="font-heading text-4xl sm:text-5xl font-extrabold text-neutral-900 tracking-tight">
          Clés d'API & Authentification
        </h1>
        <p className="text-lg text-neutral-600 leading-relaxed border-b border-neutral-200 pb-8">
          Découvrez comment générer et utiliser vos clés secrètes pour sécuriser vos accès.
        </p>
      </header>

      <div className="prose prose-neutral max-w-none">
        <p>
          Pour interagir avec l'API d'Iris ou configurer le serveur <strong>MCP</strong>, vous devez vous authentifier à 
          l'aide d'une clé d'API. Ces clés sont strictement confidentielles et ne doivent jamais être 
          exposées côté client.
        </p>

        <h3 className="text-xl font-bold font-heading mt-8">Générer une clé d'API</h3>
        <p>
          Rendez-vous dans la section <a href="/automations" className="text-[#C84B31] font-medium hover:underline">Automatisations</a> de 
          votre tableau de bord Iris. Cliquez sur "Générer une clé". 
        </p>
        
        <div className="bg-[#fefce8] border-l-4 border-[#eab308] p-5 rounded-r-xl my-6">
          <h4 className="font-bold text-[#854d0e] m-0 mb-2">Attention : Affichage unique</h4>
          <p className="text-sm text-[#854d0e] m-0">
            Pour des raisons de sécurité, votre clé secrète n'est affichée qu'une seule fois, au moment de sa création. 
            Iris ne stocke qu'une empreinte chiffrée. Si vous la perdez, vous devrez en générer une nouvelle.
          </p>
        </div>

        <h3 className="text-xl font-bold font-heading mt-8">Utiliser votre clé</h3>
        <p>
          Toutes les requêtes API doivent inclure l'en-tête suivant :
        </p>
        <pre className="bg-neutral-900 text-neutral-100 p-4 rounded-xl overflow-x-auto text-sm">
{`Authorization: Bearer lg_votre_cle_api`}
        </pre>
        <p>
          Si vous utilisez notre serveur MCP, vous pouvez l'intégrer directement dans les variables 
          d'environnement sous le nom <code>IRIS_API_KEY</code>, ou l'ajouter en paramètre d'URL (<code>?key=...</code>).
        </p>
      </div>
    </div>
  );
}
