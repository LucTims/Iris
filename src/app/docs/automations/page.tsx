import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Automatisation & MCP - Iris Docs",
  description: "Comment utiliser le serveur MCP pour connecter vos assistants IA à Iris.",
};

export default function AutomationsDocsPage() {
  return (
    <div className="space-y-10">
      <header className="space-y-4 border-b border-neutral-200 dark:border-neutral-800 pb-10">
        <div className="inline-flex items-center justify-center mb-2">
          <div className="bg-[#FDF3F1] dark:bg-[#FDF3F1]/10 text-[#C84B31] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest">
            Tutoriel MCP
          </div>
        </div>
        <h1 className="font-heading text-3xl sm:text-5xl font-extrabold text-neutral-900 dark:text-neutral-100 tracking-tight">
          Automatisation & Model Context Protocol
        </h1>
        <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl">
          Iris expose de façon sécurisée un serveur MCP (Model Context Protocol). Cela permet 
          aux assistants IA locaux (Cursor, Claude Desktop) d'accéder à vos livres et chapitres pour vous aider.
        </p>
      </header>

      <div className="prose prose-neutral dark:prose-invert max-w-none">
        <h2>Qu'est-ce que MCP ?</h2>
        <p>
          Le <strong>Model Context Protocol</strong> est un standard ouvert permettant 
          aux assistants IA d'utiliser des outils externes. En configurant le serveur Iris MCP,
          votre agent IA préféré sera capable de lister vos projets, de lire le contenu de vos chapitres,
          et même d'en créer de nouveaux sans que vous ayez à copier/coller.
        </p>

        <h2>Comment obtenir vos accès</h2>
        <ol>
          <li>Connectez-vous à votre compte Iris.</li>
          <li>Rendez-vous dans la section <strong>Paramètres</strong> ou <strong>Automatisations</strong>.</li>
          <li>Générez une nouvelle clé d'API. <em>(Attention: elle ne s'affiche qu'une seule fois)</em>.</li>
        </ol>

        <h2>Configuration Claude Desktop</h2>
        <p>Pour lier Iris à Claude Desktop, éditez votre fichier de configuration <code>claude_desktop_config.json</code> :</p>
        
        <pre className="bg-neutral-900 text-neutral-100 p-4 rounded-xl overflow-x-auto text-sm">
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

        <div className="bg-[#FDF3F1] dark:bg-[#C84B31]/10 border-l-4 border-[#C84B31] p-5 rounded-r-xl my-8">
          <h4 className="font-bold text-[#C84B31] m-0 mb-2">Important : Sécurité</h4>
          <p className="text-sm text-neutral-700 dark:text-neutral-300 m-0">
            Votre clé d'API donne un accès complet en lecture et écriture à vos livres. 
            Ne la partagez jamais publiquement (ex: GitHub, forums). En cas de doute, 
            vous pouvez la révoquer instantanément depuis votre tableau de bord.
          </p>
        </div>

        <h2>Outils exposés par le Serveur MCP</h2>
        <p>Une fois configuré, les outils suivants deviennent disponibles pour votre IA :</p>
        <ul>
          <li><code>list_books</code> : Récupère la liste de vos projets littéraires.</li>
          <li><code>read_book_content</code> : Lit la structure et les chapitres d'un livre.</li>
          <li><code>update_chapter</code> : Modifie le contenu d'un chapitre spécifique.</li>
          <li><code>generate_outline</code> : Génère un plan de livre automatiquement.</li>
        </ul>
      </div>
    </div>
  );
}
