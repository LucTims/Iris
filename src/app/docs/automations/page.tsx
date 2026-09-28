import { Metadata } from "next";
import { Zap, ShieldCheck, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Automatisation & MCP - Iris Docs",
  description: "Comment utiliser le serveur MCP pour connecter vos assistants IA à Iris.",
};

export default function AutomationsDocsPage() {
  return (
    <div className="space-y-12">
      <header className="space-y-4">
        <p className="inline-flex items-center gap-1.5 text-[#C84B31] bg-[#C84B31]/10 px-3 py-1 rounded-full font-bold text-xs uppercase tracking-wider">
          <Zap className="w-3.5 h-3.5" />
          Guide Développeur
        </p>
        <h1 className="font-heading text-4xl sm:text-5xl font-extrabold text-neutral-900 dark:text-neutral-100 tracking-tight">
          Intégration MCP
        </h1>
        <p className="text-lg text-neutral-600 dark:text-neutral-400 leading-relaxed border-b border-neutral-200/80 dark:border-neutral-800 pb-10">
          Connectez Iris à vos assistants IA locaux via le standard Model Context Protocol. Pilotez votre espace auteur directement depuis votre environnement de travail.
        </p>
      </header>

      <div className="prose prose-neutral dark:prose-invert max-w-none prose-headings:font-heading prose-headings:font-extrabold prose-h2:text-2xl prose-h2:mb-4 prose-h2:mt-10 prose-p:text-neutral-600 dark:prose-p:text-neutral-400 prose-p:leading-relaxed prose-li:text-neutral-600 dark:prose-li:text-neutral-400 prose-strong:text-neutral-900 dark:prose-strong:text-neutral-100">
        <h2>Qu'est-ce que MCP ?</h2>
        <p>
          Le <strong>Model Context Protocol</strong> est un standard ouvert permettant 
          aux assistants IA d'utiliser des outils externes. En configurant le serveur Iris MCP,
          votre agent IA préféré sera capable de lister vos projets, de lire le contenu de vos chapitres,
          et même d'en créer de nouveaux sans que vous ayez à copier/coller.
        </p>

        <h2>Comment obtenir vos accès</h2>
        <ul className="list-none space-y-3 pl-0 my-6">
          <li className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-[#C84B31] shrink-0 mt-0.5" />
            <span>Connectez-vous à votre compte Iris.</span>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-[#C84B31] shrink-0 mt-0.5" />
            <span>Rendez-vous dans la section <strong>Automatisations</strong> via le menu de gauche.</span>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-[#C84B31] shrink-0 mt-0.5" />
            <span>Générez une nouvelle clé d'API. <em>(Attention: elle ne s'affiche qu'une seule fois, stockez-la en sécurité)</em>.</span>
          </li>
        </ul>

        <h2>Configuration Claude Desktop</h2>
        <p>Pour lier Iris à Claude Desktop, éditez votre fichier de configuration <code>claude_desktop_config.json</code> en y ajoutant le serveur Iris :</p>
        
        <div className="relative group mt-6 mb-8">
          <div className="absolute -inset-1 bg-gradient-to-r from-[#C84B31]/20 to-orange-400/20 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
          <pre className="relative bg-[#1E1E1E] text-neutral-100 p-6 rounded-2xl overflow-x-auto text-sm font-mono leading-relaxed border border-white/10 shadow-2xl">
{`{
  "mcpServers": {
    "iris-mcp": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-sse",
        "https://irisboom.online/api/mcp"
      ],
      "env": {
        "IRIS_API_KEY": "lg_votre_cle_secrete_ici"
      }
    }
  }
}`}
          </pre>
        </div>

        <div className="bg-[#FDF3F1] dark:bg-[#C84B31]/10 border-l-4 border-[#C84B31] p-6 rounded-r-2xl my-10 shadow-sm flex gap-4 items-start">
          <ShieldCheck className="w-6 h-6 text-[#C84B31] shrink-0" />
          <div>
            <h4 className="font-bold font-heading text-[#C84B31] text-lg m-0 mb-2">Important : Sécurité de vos manuscrits</h4>
            <p className="text-sm text-neutral-700 dark:text-neutral-300 m-0 leading-relaxed">
              Votre clé d'API donne un accès complet en lecture et écriture à vos livres. 
              Ne la partagez jamais publiquement (ex: GitHub, forums). En cas de doute, 
              vous pouvez la révoquer instantanément depuis votre tableau de bord.
            </p>
          </div>
        </div>

        <h2>Outils exposés par le Serveur MCP</h2>
        <p>Une fois configuré, les outils suivants deviennent disponibles pour votre IA :</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div className="p-5 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50">
            <code className="text-[#C84B31] bg-[#C84B31]/10 px-2 py-1 rounded-md text-xs font-bold">list_books</code>
            <p className="text-sm mt-3 mb-0">Récupère la liste de vos projets littéraires avec leurs IDs.</p>
          </div>
          <div className="p-5 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50">
            <code className="text-[#C84B31] bg-[#C84B31]/10 px-2 py-1 rounded-md text-xs font-bold">read_book_content</code>
            <p className="text-sm mt-3 mb-0">Lit la structure et les chapitres complets d'un livre spécifique.</p>
          </div>
          <div className="p-5 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50">
            <code className="text-[#C84B31] bg-[#C84B31]/10 px-2 py-1 rounded-md text-xs font-bold">update_chapter</code>
            <p className="text-sm mt-3 mb-0">Modifie le contenu d'un chapitre spécifique sans écraser le reste.</p>
          </div>
          <div className="p-5 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50">
            <code className="text-[#C84B31] bg-[#C84B31]/10 px-2 py-1 rounded-md text-xs font-bold">generate_outline</code>
            <p className="text-sm mt-3 mb-0">Génère un plan de livre automatiquement basé sur un thème.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
