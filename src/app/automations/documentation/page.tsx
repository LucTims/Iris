"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import {
  BookOpen,
  ShieldCheck,
  Plug,
  Wrench,
  AlertTriangle,
  ArrowLeft,
  KeyRound,
  Coins,
  Terminal,
  Eye,
  Ban,
} from "lucide-react";

/**
 * Documentation de la connexion MCP.
 *
 * Le contenu décrit le serveur RÉELLEMENT implémenté (`src/lib/mcp/server.ts`,
 * `src/lib/mcp/auth.ts`, `src/app/api/mcp/route.ts`) : les neuf outils exposés,
 * le transport Streamable HTTP sans état, l'authentification par clé hachée en
 * SHA-256, et le fait que chaque outil filtre par `user_id`. Rien n'y est
 * promis qui ne soit pas branché.
 */

type ToolDoc = {
  name: string;
  summary: string;
  params: string;
  writes: boolean;
  costsCoins?: string;
};

const TOOLS: ToolDoc[] = [
  {
    name: "list_projects",
    summary: "Liste vos livres avec leur statut et leur date de mise à jour.",
    params: "aucun",
    writes: false,
  },
  {
    name: "get_project",
    summary: "Fiche complète d'un livre : synopsis, ton, public, personnages, consignes.",
    params: "book_id",
    writes: false,
  },
  {
    name: "list_chapters",
    summary: "Sommaire d'un livre : numéro, titre et nombre de mots de chaque chapitre.",
    params: "book_id",
    writes: false,
  },
  {
    name: "read_chapter",
    summary: "Contenu d'un chapitre précis.",
    params: "book_id, chapter_number",
    writes: false,
  },
  {
    name: "get_wallet_balance",
    summary: "Solde de pièces de votre compte.",
    params: "aucun",
    writes: false,
  },
  {
    name: "create_book",
    summary: "Crée un nouveau projet de livre.",
    params: "title, synopsis, category, tone, audience",
    writes: true,
  },
  {
    name: "write_chapter",
    summary: "Écrit ou remplace le contenu d'un chapitre.",
    params: "book_id, chapter_number, title, content",
    writes: true,
  },
  {
    name: "generate_cover",
    summary: "Génère une couverture pour un livre.",
    params: "book_id, prompt, engine",
    writes: true,
    costsCoins: "200 pièces en mode premium, gratuit sinon",
  },
  {
    name: "export_pdf",
    summary: "Compose le livre en PDF et renvoie le lien de téléchargement.",
    params: "book_id, format",
    writes: false,
  },
];

function Section({
  icon: Icon,
  title,
  children,
  tone = "neutral",
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  tone?: "neutral" | "warning";
}) {
  return (
    <section
      className={`rounded-3xl border shadow-2xs overflow-hidden ${
        tone === "warning"
          ? "bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60"
          : "bg-white dark:bg-neutral-900 border-neutral-200/80 dark:border-neutral-800"
      }`}
    >
      <div className="p-6 sm:p-8 space-y-4">
        <h2 className="font-heading text-lg font-extrabold text-neutral-900 dark:text-neutral-100 flex items-center gap-2.5">
          <span
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              tone === "warning"
                ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"
                : "bg-orange-50 dark:bg-orange-950/40 text-secondary"
            }`}
          >
            <Icon className="w-4 h-4" />
          </span>
          {title}
        </h2>
        <div className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed space-y-3">
          {children}
        </div>
      </div>
    </section>
  );
}

export default function McpDocumentationPage() {
  const [origin, setOrigin] = useState("");

  // L'origine réelle (domaine de production, aperçu Vercel…) n'est connue que
  // côté navigateur : on ne peut pas l'écrire en dur.
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const mcpUrl = `${origin || "https://votre-domaine"}/api/mcp`;

  return (
    <AppLayout>
      <header className="bg-white dark:bg-neutral-900/80 dark:bg-neutral-950/80 backdrop-blur-md border-b border-neutral-100 dark:border-neutral-800 sticky top-0 z-20 h-16 px-4 md:px-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/automations"
            className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:text-neutral-100 dark:hover:text-white bg-neutral-100 dark:bg-neutral-800 px-3 py-2 rounded-xl transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Automatisations</span>
          </Link>
          <h1 className="font-heading font-extrabold text-lg sm:text-xl text-neutral-900 dark:text-neutral-100 flex items-center gap-2 truncate">
            <BookOpen className="w-5 h-5 text-secondary shrink-0" strokeWidth={2.5} />
            <span className="truncate">Documentation MCP</span>
          </h1>
        </div>
      </header>

      <main className="p-4 sm:p-6 md:p-10 max-w-4xl mx-auto w-full space-y-6">
        <div className="space-y-2">
          <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
            La connexion MCP relie votre bibliothèque Iris à un assistant IA externe
            (Claude, ChatGPT, Cursor, n8n, Make…). L&apos;assistant peut alors lire vos
            livres et écrire dedans <strong>en votre nom</strong>, sans que vous ayez à
            copier-coller quoi que ce soit.
          </p>
        </div>

        <Section icon={Plug} title="Ce qu'est MCP, concrètement">
          <p>
            MCP (<em>Model Context Protocol</em>) est un standard ouvert qui permet à un
            assistant IA d&apos;appeler des outils sur un service tiers. Iris expose un
            serveur MCP à cette adresse :
          </p>
          <pre className="bg-neutral-900 dark:bg-black text-neutral-100 p-3 rounded-xl text-xs overflow-x-auto font-mono">
            {mcpUrl}
          </pre>
          <p>
            Le transport utilisé est <strong>Streamable HTTP sans état</strong> : chaque
            requête porte un message complet et sa réponse. Il n&apos;y a aucune session
            partagée entre deux appels, ce qui rend la connexion fiable derrière un
            hébergement sans serveur — deux requêtes successives peuvent atterrir sur
            deux machines différentes sans que cela pose problème.
          </p>
        </Section>

        <Section icon={Wrench} title="Les 9 outils exposés">
          <p>
            Un assistant connecté voit exactement ces outils, et rien d&apos;autre. Les
            outils marqués <strong>écriture</strong> modifient vos données.
          </p>
          <div className="overflow-x-auto -mx-2 px-2">
            <table className="w-full text-xs border-collapse min-w-[640px]">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  <th className="py-2 pr-3 font-bold">Outil</th>
                  <th className="py-2 pr-3 font-bold">Ce qu&apos;il fait</th>
                  <th className="py-2 pr-3 font-bold">Paramètres</th>
                  <th className="py-2 font-bold">Accès</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {TOOLS.map((tool) => (
                  <tr key={tool.name} className="align-top">
                    <td className="py-2.5 pr-3">
                      <code className="font-mono font-bold text-secondary">{tool.name}</code>
                    </td>
                    <td className="py-2.5 pr-3 text-neutral-600 dark:text-neutral-300">
                      {tool.summary}
                      {tool.costsCoins && (
                        <span className="block mt-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 inline-flex items-center gap-1">
                          <Coins className="w-3 h-3" /> {tool.costsCoins}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 font-mono text-[10px] text-neutral-500 dark:text-neutral-400">
                      {tool.params}
                    </td>
                    <td className="py-2.5">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                          tool.writes
                            ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"
                            : "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
                        }`}
                      >
                        {tool.writes ? "Écriture" : "Lecture"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section icon={ShieldCheck} title="Sécurité : ce qui protège vos livres">
          <ul className="space-y-3 list-none">
            <li className="flex gap-3">
              <KeyRound className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
              <span>
                <strong>Votre clé n&apos;est jamais stockée en clair.</strong> Iris n&apos;en
                conserve que l&apos;empreinte SHA-256 et un aperçu tronqué
                (<code className="text-[11px]">lg_abc…7f2c</code>). Même quelqu&apos;un
                ayant accès à la base de données ne pourrait pas reconstituer votre clé.
                C&apos;est pour cette raison qu&apos;elle ne s&apos;affiche en entier
                qu&apos;une seule fois, à sa création : Iris ne peut pas vous la
                remontrer ensuite.
              </span>
            </li>
            <li className="flex gap-3">
              <Eye className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
              <span>
                <strong>Cloisonnement par compte.</strong> La clé identifie votre compte,
                et chaque outil filtre systématiquement sur votre identifiant
                d&apos;utilisateur. Un assistant connecté ne peut ni voir ni modifier le
                livre de quelqu&apos;un d&apos;autre, même en fournissant un identifiant
                de projet qui ne vous appartient pas — la requête ne renvoie simplement
                rien.
              </span>
            </li>
            <li className="flex gap-3">
              <Ban className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
              <span>
                <strong>Révocation immédiate.</strong> Régénérer votre clé depuis la page
                Automatisations désactive instantanément l&apos;ancienne : tout assistant
                encore configuré avec elle reçoit une erreur d&apos;autorisation au
                prochain appel.
              </span>
            </li>
            <li className="flex gap-3">
              <Coins className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
              <span>
                <strong>Les pièces restent les vôtres.</strong> Les outils qui déclenchent
                une génération IA débitent votre portefeuille exactement comme s&apos;ils
                étaient lancés depuis l&apos;application. Un solde insuffisant fait
                échouer l&apos;appel plutôt que de générer à crédit.
              </span>
            </li>
            <li className="flex gap-3">
              <ShieldCheck className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
              <span>
                <strong>Traçabilité.</strong> La date du dernier usage de la clé est
                enregistrée à chaque appel. Une date que vous ne reconnaissez pas est le
                signal qu&apos;il faut régénérer la clé.
              </span>
            </li>
          </ul>
        </Section>

        <Section icon={AlertTriangle} title="Ce qu'il faut savoir avant de connecter" tone="warning">
          <ul className="space-y-2.5 list-disc pl-5">
            <li>
              <strong>Une clé vaut un accès complet à vos livres.</strong> Traitez-la
              comme un mot de passe : ne la collez ni dans une conversation publique, ni
              dans un dépôt de code, ni dans une capture d&apos;écran.
            </li>
            <li>
              <strong>Préférez l&apos;en-tête à l&apos;URL.</strong> Iris accepte la clé
              via <code className="text-[11px]">Authorization: Bearer …</code> (recommandé)
              ou via <code className="text-[11px]">?key=…</code> dans l&apos;adresse. La
              seconde forme n&apos;existe que pour les clients qui ne permettent de coller
              qu&apos;une URL : une clé dans une URL a beaucoup plus de chances de finir
              dans un journal de serveur ou un historique.
            </li>
            <li>
              <strong>
                L&apos;écriture n&apos;est pas réversible depuis l&apos;assistant.
              </strong>{" "}
              <code className="text-[11px]">write_chapter</code> remplace le contenu du
              chapitre visé. Demandez à votre assistant de lire le chapitre avant de le
              réécrire si vous tenez à la version en cours.
            </li>
            <li>
              <strong>Un assistant peut se tromper de livre.</strong> Donnez-lui
              l&apos;identifiant exact du projet plutôt que son titre quand vous avez
              plusieurs ouvrages aux noms proches.
            </li>
          </ul>
        </Section>

        <Section icon={Terminal} title="Connecter votre outil">
          <p className="font-bold text-neutral-800 dark:text-neutral-100">
            Claude Desktop, Cursor, Windsurf
          </p>
          <p>
            Ces clients passent par <code className="text-[11px]">mcp-remote</code>.
            Ajoutez ce bloc à leur fichier de configuration MCP :
          </p>
          <pre className="bg-neutral-900 dark:bg-black text-neutral-100 p-3 rounded-xl text-[11px] overflow-x-auto font-mono leading-relaxed">
{`{
  "mcpServers": {
    "iris": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "${mcpUrl}?key=VOTRE_CLE"]
    }
  }
}`}
          </pre>

          <p className="font-bold text-neutral-800 dark:text-neutral-100 pt-2">
            n8n, Make, Zapier et appels directs
          </p>
          <p>
            Ces plateformes envoient des requêtes HTTP : utilisez l&apos;en-tête
            d&apos;autorisation, plus sûr que la clé dans l&apos;URL.
          </p>
          <pre className="bg-neutral-900 dark:bg-black text-neutral-100 p-3 rounded-xl text-[11px] overflow-x-auto font-mono leading-relaxed">
{`curl -X POST ${mcpUrl} \\
  -H "Authorization: Bearer VOTRE_CLE" \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`}
          </pre>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            <code className="text-[11px]">tools/list</code> est le meilleur test de
            connexion : il ne modifie rien et renvoie la liste des neuf outils ci-dessus.
          </p>
        </Section>

        <Section icon={AlertTriangle} title="Résoudre un problème">
          <dl className="space-y-3">
            <div>
              <dt className="font-bold text-neutral-800 dark:text-neutral-100">
                « Non autorisé : clé API MCP manquante ou invalide »
              </dt>
              <dd className="text-neutral-600 dark:text-neutral-300">
                La clé est absente, mal recopiée ou a été révoquée par une régénération.
                Générez-en une nouvelle depuis Automatisations et remplacez-la partout.
              </dd>
            </div>
            <div>
              <dt className="font-bold text-neutral-800 dark:text-neutral-100">
                L&apos;assistant ne voit aucun outil
              </dt>
              <dd className="text-neutral-600 dark:text-neutral-300">
                L&apos;adresse est probablement incomplète. Elle doit se terminer par
                <code className="text-[11px]"> /api/mcp</code>, sans barre oblique finale.
              </dd>
            </div>
            <div>
              <dt className="font-bold text-neutral-800 dark:text-neutral-100">
                « Projet introuvable » alors que le livre existe
              </dt>
              <dd className="text-neutral-600 dark:text-neutral-300">
                L&apos;identifiant transmis n&apos;appartient pas au compte de la clé
                utilisée. Demandez d&apos;abord <code className="text-[11px]">list_projects</code>,
                puis reprenez l&apos;identifiant exact qu&apos;il renvoie.
              </dd>
            </div>
            <div>
              <dt className="font-bold text-neutral-800 dark:text-neutral-100">
                Une génération échoue pour fonds insuffisants
              </dt>
              <dd className="text-neutral-600 dark:text-neutral-300">
                Les outils MCP consomment les mêmes pièces que l&apos;application.
                Vérifiez votre solde avec <code className="text-[11px]">get_wallet_balance</code>.
              </dd>
            </div>
          </dl>
        </Section>

        <div className="pb-10">
          <Link
            href="/automations"
            className="inline-flex items-center gap-2 bg-[#C84B31] hover:bg-[#B83E26] text-white text-xs font-bold px-5 py-3 rounded-xl transition-all shadow-2xs"
          >
            <KeyRound className="w-4 h-4" />
            <span>Gérer ma clé de connexion</span>
          </Link>
        </div>
      </main>
    </AppLayout>
  );
}
