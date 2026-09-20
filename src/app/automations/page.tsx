"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import { useUser } from "@/hooks/useUser";
import { Copy, CheckCircle2, Info, Users, BookOpen, ChevronDown, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { sha256Hex } from "@/lib/mcp/hash";

function randomApiKey(): string {
  const randomPart = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  return "lg_" + randomPart;
}

function previewOf(key: string): string {
  return `${key.slice(0, 6)}...${key.slice(-4)}`;
}

export default function AutomationsPage() {
  const { user, displayName } = useUser();
  // Clé en clair : connue UNIQUEMENT juste après sa création dans cette
  // session (seul son hash est persisté en base, voir lib/mcp/hash.ts et la
  // migration 20260918120000_hash_api_keys). Ré-ouvrir la page plus tard ne
  // permet plus de la retrouver, par design — comme un token GitHub/Stripe.
  const [apiKey, setApiKey] = useState<string | null>(null);
  // Aperçu tronqué d'une clé déjà existante (issue de la base), pour
  // affichage même quand on n'a pas le texte en clair.
  const [keyPreview, setKeyPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNameCopied, setIsNameCopied] = useState(false);
  const [isUrlCopied, setIsUrlCopied] = useState(false);
  // L'URL du serveur MCP est sur le domaine de l'app elle-même (/api/mcp) : on
  // ne peut connaître l'origine réelle (irisboom.shop, preview Vercel, etc.)
  // que côté client, d'où ce state rempli après montage plutôt qu'en dur.
  const [origin, setOrigin] = useState("");

  const supabase = createClient();

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const createAndStoreKey = async (name: string) => {
    if (!user) return;
    const newKey = randomApiKey();
    const keyHash = await sha256Hex(newKey);
    const preview = previewOf(newKey);

    const { error } = await supabase.from('api_keys').insert({
      user_id: user.id,
      key_hash: keyHash,
      key_preview: preview,
      name,
    });

    if (!error) {
      setApiKey(newKey);
      setKeyPreview(preview);
    } else {
      console.error("Erreur génération clé:", error);
      alert("Erreur lors de la génération de la clé.");
    }
  };

  useEffect(() => {
    if (!user) return;
    async function fetchOrGenerateKey() {
      // Vérifier si une clé existe déjà (on ne peut récupérer que son aperçu,
      // pas sa valeur en clair : seul le hash est stocké en base).
      const { data, error } = await supabase
        .from('api_keys')
        .select('key_preview')
        .eq('user_id', user!.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (data && !error) {
        setKeyPreview(data.key_preview);
      } else {
        // Aucune clé trouvée, on en génère une automatiquement et on
        // l'affiche cette fois-ci (unique occasion de voir le texte en clair).
        await createAndStoreKey('Clé MCP Automatique');
      }
      setIsLoading(false);
    }
    fetchOrGenerateKey();
  }, [user]);

  const generateApiKey = async () => {
    if (!user) return;
    setIsLoading(true);
    // On invalide les anciennes clés
    await supabase.from('api_keys').update({ is_active: false }).eq('user_id', user.id);
    await createAndStoreKey('Clé MCP Primaire');
    setIsLoading(false);
  };

  const serverName = `Iris - ${displayName || "Auteur"}`;
  // On remet la clé dans l'URL pour que l'utilisateur n'ait qu'à copier l'URL !
  // (le serveur accepte aussi `Authorization: Bearer <clé>` pour les clients
  // qui permettent de configurer un en-tête personnalisé.)
  // Uniquement disponible juste après une (re)génération : voir le commentaire
  // sur `apiKey` plus haut.
  const mcpUrl = apiKey && origin ? `${origin}/api/mcp?key=${apiKey}` : null;
  const urlFieldValue = mcpUrl
    ?? (keyPreview ? `${keyPreview} — régénérez pour afficher l'URL complète` : 'Génération en cours...');

  const copyToClipboard = (text: string | null, type: 'name' | 'url' | 'key') => {
    if(!text) return;
    navigator.clipboard.writeText(text);
    if (type === 'name') {
      setIsNameCopied(true);
      setTimeout(() => setIsNameCopied(false), 2000);
    } else if (type === 'url') {
      setIsUrlCopied(true);
      setTimeout(() => setIsUrlCopied(false), 2000);
    }
  };

  const [openGuide, setOpenGuide] = useState<string | null>(null);

  const toggleGuide = (guide: string) => {
    setOpenGuide(openGuide === guide ? null : guide);
  };

  return (
    <AppLayout>
      <main className="p-6 md:p-10 max-w-4xl mx-auto w-full space-y-12">
        
        {/* Header Section */}
        <div className="space-y-4 text-center max-w-3xl mx-auto">
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
            Connexion MCP
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 text-sm md:text-base leading-relaxed">
            Le protocole MCP (Model Context Protocol) permet à vos assistants IA d'accéder directement à vos 
            données Iris. Fini le copier-coller : vos outils IA peuvent consulter et générer vos histoires en
            temps réel. Voici ce que vous pouvez faire avec MCP :
          </p>
          <div>
            <Link
              href="/docs/automations"
              className="inline-flex items-center gap-2 text-xs font-bold text-brand bg-[#FDF3F1] hover:bg-[#FCE7E1] border border-[#FCE7E1] px-4 py-2.5 rounded-xl transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              <span>Documentation complète : outils, sécurité, dépannage</span>
            </Link>
          </div>
        </div>

        {/* Features Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto text-center">
          <div className="flex flex-col items-center space-y-2">
            <div className="w-10 h-10 flex items-center justify-center text-neutral-500 dark:text-neutral-400 mb-1">
              <BookOpen strokeWidth={1.5} className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Projets & Chapitres</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Analysez et rédigez le contenu de vos livres
            </p>
          </div>
          <div className="flex flex-col items-center space-y-2">
            <div className="w-10 h-10 flex items-center justify-center text-neutral-500 dark:text-neutral-400 mb-1">
              <Users strokeWidth={1.5} className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Bible & Personnages</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Consultez les fiches de vos personnages
            </p>
          </div>
        </div>

        {/* Configuration Card */}
        <div className="bg-neutral-50/80 rounded-2xl p-6 md:p-8 space-y-6">
          <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">Informations du serveur MCP</h2>
          
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-800 dark:text-neutral-200">Nom</label>
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  readOnly 
                  value={serverName}
                  className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-neutral-700 dark:text-neutral-300 focus:outline-none focus:border-neutral-300"
                />
                <button 
                  onClick={() => copyToClipboard(serverName, 'name')}
                  className="shrink-0 p-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:bg-neutral-800/50 hover:text-neutral-700 dark:text-neutral-300 transition-colors"
                  title="Copier le nom"
                >
                  {isNameCopied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-800 dark:text-neutral-200">URL</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={urlFieldValue}
                  className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg px-4 py-2.5 text-sm font-mono text-neutral-700 dark:text-neutral-300 focus:outline-none focus:border-neutral-300"
                />
                <button
                  onClick={() => copyToClipboard(mcpUrl, 'url')}
                  disabled={!mcpUrl}
                  className="shrink-0 p-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:bg-neutral-800/50 hover:text-neutral-700 dark:text-neutral-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Copier l'URL"
                >
                  {isUrlCopied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
                <button
                  onClick={generateApiKey}
                  disabled={isLoading}
                  className="shrink-0 p-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:bg-neutral-800/50 hover:text-neutral-700 dark:text-neutral-300 transition-colors disabled:opacity-50"
                  title="Révoquer et générer une nouvelle URL sécurisée"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                {mcpUrl
                  ? "Copiez cette URL maintenant : pour votre sécurité, elle ne sera plus jamais affichée en clair. Régénérez-en une nouvelle si vous la perdez."
                  : "Cette clé a déjà été affichée une fois par le passé et ne peut plus être récupérée en clair. Cliquez sur régénérer pour en obtenir une nouvelle et copier son URL."}
              </p>
            </div>
          </div>
        </div>

        {/* Privacy Alert */}
        <div className="bg-amber-50 border border-amber-200/60 rounded-xl p-5 flex gap-3 items-start">
          <Info className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div className="space-y-1 text-amber-800">
            <h4 className="font-semibold text-sm">À propos de la confidentialité</h4>
            <p className="text-sm leading-relaxed">
              En connectant un assistant IA via MCP, vous autorisez le partage de vos données Iris (projets, chapitres, personnages) 
              avec ce service tiers. Ces données sont transmises de manière sécurisée et utilisées uniquement pour répondre à vos requêtes. 
              Consultez la politique de confidentialité de chaque service pour plus de détails.
            </p>
          </div>
        </div>

        {/* Guides Section */}
        <div className="space-y-4 pt-4 border-t border-neutral-100 dark:border-neutral-800">
          <h2 className="font-heading text-xl font-bold text-neutral-900 dark:text-neutral-100">Guides d'installation</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Guide Claude.ai / ChatGPT */}
            <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden bg-white dark:bg-neutral-900">
              <button
                onClick={() => toggleGuide('remote')}
                className="w-full flex items-center justify-between p-4 hover:bg-neutral-50 dark:bg-neutral-800/50 transition-colors group"
              >
                <div className="flex flex-col items-start">
                  <span className="font-medium text-neutral-900 dark:text-neutral-100">Connecter Claude.ai ou ChatGPT</span>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">Connecteur distant, sans installation</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-neutral-400 group-hover:text-neutral-600 dark:text-neutral-400 transition-transform ${openGuide === 'remote' ? 'rotate-180' : ''}`} />
              </button>
              {openGuide === 'remote' && (
                <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 border-t border-neutral-200 dark:border-neutral-800 text-sm text-neutral-600 dark:text-neutral-400 space-y-3">
                  <p>1. Dans Claude.ai : Réglages &gt; Connecteurs &gt; <strong>Ajouter un connecteur personnalisé</strong>. Dans ChatGPT : Réglages &gt; Connecteurs &gt; <strong>Créer</strong>.</p>
                  <p>2. Collez l'URL générée ci-dessus dans le champ URL du serveur MCP.</p>
                  <p>3. Aucun fichier de configuration n'est nécessaire : ces assistants se connectent directement au serveur distant.</p>
                </div>
              )}
            </div>

            {/* Guide Cursor */}
            <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden bg-white dark:bg-neutral-900">
              <button
                onClick={() => toggleGuide('cursor')}
                className="w-full flex items-center justify-between p-4 hover:bg-neutral-50 dark:bg-neutral-800/50 transition-colors group"
              >
                <div className="flex flex-col items-start">
                  <span className="font-medium text-neutral-900 dark:text-neutral-100">Connecter Cursor</span>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">Client MCP distant natif</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-neutral-400 group-hover:text-neutral-600 dark:text-neutral-400 transition-transform ${openGuide === 'cursor' ? 'rotate-180' : ''}`} />
              </button>
              {openGuide === 'cursor' && (
                <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 border-t border-neutral-200 dark:border-neutral-800 text-sm text-neutral-600 dark:text-neutral-400 space-y-3">
                  <p>1. Ouvrez les paramètres de Cursor (Cursor Settings &gt; Features &gt; MCP).</p>
                  <p>2. Cliquez sur <strong>+ Add New MCP Server</strong>.</p>
                  <p>3. Collez l'URL générée ci-dessus (la clé de sécurité y est déjà incluse) ; Cursor détecte automatiquement le transport.</p>
                  <p>4. Enregistrez et commencez à discuter avec votre projet !</p>
                </div>
              )}
            </div>

            {/* Guide Claude Desktop */}
            <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden bg-white dark:bg-neutral-900">
              <button
                onClick={() => toggleGuide('claude-desktop')}
                className="w-full flex items-center justify-between p-4 hover:bg-neutral-50 dark:bg-neutral-800/50 transition-colors group"
              >
                <div className="flex flex-col items-start">
                  <span className="font-medium text-neutral-900 dark:text-neutral-100">Connecter Claude Desktop</span>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">Via mcp-remote</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-neutral-400 group-hover:text-neutral-600 dark:text-neutral-400 transition-transform ${openGuide === 'claude-desktop' ? 'rotate-180' : ''}`} />
              </button>
              {openGuide === 'claude-desktop' && (
                <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 border-t border-neutral-200 dark:border-neutral-800 text-sm text-neutral-600 dark:text-neutral-400 space-y-3">
                  <p>Ajoutez ceci à votre fichier <code className="bg-neutral-200 px-1 rounded text-xs">claude_desktop_config.json</code> :</p>
                  <pre className="bg-[#1E1E1E] text-white p-3 rounded-lg text-xs overflow-x-auto">
{`{
  "mcpServers": {
    "iris-mcp": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "${urlFieldValue}"
      ]
    }
  }
}`}
                  </pre>
                </div>
              )}
            </div>

          </div>
        </div>

      </main>
    </AppLayout>
  );
}
