import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { MCP_COINS_PER_PAGE, WORDS_PER_PAGE } from "@/lib/ai/pricing";
import { renderBookPdf } from "@/lib/export/pdfBook";
import { writeChapterWithBilling } from "@/lib/mcp/writeChapter";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.irisboom.online";
const MCP_PRICE_NOTE = `L'écriture via MCP coûte ${MCP_COINS_PER_PAGE} pièces par page ajoutée (1 page ≈ ${WORDS_PER_PAGE} mots) ; réenregistrer ou corriger un chapitre sans l'allonger est gratuit.`;

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Construit un serveur MCP scopé à un seul utilisateur (celui identifié par
 * la clé API de la requête). Un `McpServer` neuf est créé à chaque requête
 * HTTP — il n'y a rien de coûteux à instancier, et cela évite tout risque de
 * fuite de contexte (`userId`) d'une requête à l'autre.
 */
export function buildMcpServer(userId: string): McpServer {
  const supabase = getAdminClient();

  const server = new McpServer({
    name: "Iris-MCP",
    version: "1.0.0",
  });

  server.tool(
    "list_projects",
    "Lister les livres/projets de l'utilisateur, avec leur statut",
    {},
    async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, title, category, status, updated_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });

      if (error) {
        return { content: [{ type: "text", text: `Erreur : ${error.message}` }], isError: true };
      }

      if (!data || data.length === 0) {
        return { content: [{ type: "text", text: "Aucun projet trouvé." }] };
      }

      const list = data
        .map((p) => `- ${p.title} (id: ${p.id}, statut: ${p.status}${p.category ? `, catégorie: ${p.category}` : ""})`)
        .join("\n");
      return { content: [{ type: "text", text: list }] };
    }
  );

  server.tool(
    "get_project",
    "Récupérer la fiche complète d'un projet : synopsis, personnages, instructions (la \"bible\")",
    {
      book_id: z.string().describe("ID du projet"),
    },
    async ({ book_id }) => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, title, subtitle, category, synopsis, tone, audience, characters, instructions, status")
        .eq("id", book_id)
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        return { content: [{ type: "text", text: `Erreur : ${error.message}` }], isError: true };
      }
      if (!data) {
        return { content: [{ type: "text", text: "Projet introuvable." }], isError: true };
      }

      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "create_book",
    "Créer un nouveau projet de livre. Écrivez ensuite ses chapitres avec write_chapter.",
    {
      title: z.string().describe("Titre du livre"),
      synopsis: z.string().optional().describe("Synopsis ou résumé"),
      category: z.string().optional().describe("Catégorie / genre"),
      tone: z.string().optional().describe("Ton du livre"),
      audience: z.string().optional().describe("Public visé"),
      work_type: z
        .enum(["livre", "guide", "ebook"])
        .optional()
        .describe("Forme de l'ouvrage, qui décide de la mise en page à l'export : 'livre' (roman, récit, essai), 'guide' (pratique, étapes), 'ebook' (court)"),
    },
    async ({ title, synopsis, category, tone, audience, work_type }) => {
      const { data, error } = await supabase
        .from("projects")
        .insert({
          user_id: userId,
          title,
          synopsis: synopsis ?? null,
          category: category ?? null,
          tone: tone ?? null,
          audience: audience ?? null,
          // Mêmes colonnes que la création depuis l'application (blueprint_id
          // n'accepte que livre/guide/ebook/storybook).
          ...(work_type ? { work_type, blueprint_id: work_type } : {}),
        })
        .select("id")
        .single();

      if (error) {
        return { content: [{ type: "text", text: `Erreur lors de la création : ${error.message}` }], isError: true };
      }

      return {
        content: [{
          type: "text",
          text: `Le livre "${title}" a été créé avec succès (id: ${data.id}). Écrivez ses chapitres avec write_chapter en commençant par chapter_number = 1. ${MCP_PRICE_NOTE}`,
        }],
      };
    }
  );

  server.tool(
    "write_chapter",
    `Créer ou remplacer le contenu d'un chapitre. chapter_number est la position du chapitre dans le livre, telle que renvoyée par list_chapters (si le livre commence par un « Sommaire », celui-ci occupe la position 1 : écrivez alors le premier chapitre en position 2). Le contenu est accepté en texte brut, Markdown ou HTML : il est converti automatiquement au format du manuscrit (paragraphes, intertitres ##, listes, citations, « --- » pour un changement de scène). Le titre est ajouté en tête du chapitre : inutile de le répéter dans le contenu. Écrivez un seul chapitre par appel. ${MCP_PRICE_NOTE} Si le solde est insuffisant, rien n'est enregistré.`,
    {
      book_id: z.string().describe("ID du livre"),
      chapter_number: z.number().int().min(1).describe("Position du chapitre dans le livre (voir list_chapters)"),
      title: z.string().describe("Titre du chapitre, affiché en tête du chapitre"),
      content: z.string().describe("Contenu du chapitre : texte brut, Markdown ou HTML"),
    },
    async ({ book_id, chapter_number, title, content }) => {
      const result = await writeChapterWithBilling(supabase, userId, {
        bookId: book_id,
        chapterNumber: chapter_number,
        title,
        content,
      });

      if (result.status === "not_found") {
        return { content: [{ type: "text", text: "Projet introuvable." }], isError: true };
      }
      if (result.status === "insufficient_funds") {
        return {
          content: [{
            type: "text",
            text: `Solde insuffisant : ce chapitre ajoute ${result.billedPages} page(s), soit ${result.required} pièces, et le solde est de ${result.balance} pièces. Rien n'a été enregistré. Rechargez des pièces sur ${SITE_URL}/pricing puis réessayez.`,
          }],
          isError: true,
        };
      }
      if (result.status === "error") {
        return { content: [{ type: "text", text: `Erreur lors de la sauvegarde : ${result.message}` }], isError: true };
      }

      const billing =
        result.coinsCharged > 0
          ? `${result.coinsCharged} pièces débitées (${result.billedPages} page(s) ajoutée(s))`
          : "aucune pièce débitée (aucune page ajoutée)";
      const balance = result.balance !== null ? ` Solde restant : ${result.balance} pièces.` : "";
      return {
        content: [{
          type: "text",
          text: `Chapitre ${chapter_number} ${result.created ? "créé" : "mis à jour"} : ${result.wordCount} mots (~${result.pages} page(s)) ; ${billing}.${balance}`,
        }],
      };
    }
  );

  server.tool(
    "get_wallet_balance",
    "Consulter le solde de pièces de l'utilisateur et le tarif de l'écriture via MCP",
    {},
    async () => {
      const { data, error } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        return { content: [{ type: "text", text: `Erreur : ${error.message}` }], isError: true };
      }
      if (!data) {
        return { content: [{ type: "text", text: "Portefeuille introuvable pour cet utilisateur." }] };
      }

      return { content: [{ type: "text", text: `Solde actuel : ${data.balance} pièces. ${MCP_PRICE_NOTE}` }] };
    }
  );

  server.tool(
    "list_chapters",
    "Lister les chapitres d'un livre dans l'ordre, avec leur position (le chapter_number attendu par read_chapter et write_chapter), leur titre et leur nombre de mots",
    {
      book_id: z.string().describe("ID du projet"),
    },
    async ({ book_id }) => {
      // Vérifier que le projet appartient à l'utilisateur
      const { data: project } = await supabase
        .from("projects")
        .select("id")
        .eq("id", book_id)
        .eq("user_id", userId)
        .maybeSingle();

      if (!project) {
        return { content: [{ type: "text", text: "Projet introuvable." }], isError: true };
      }

      const { data, error } = await supabase
        .from("chapters")
        .select("id, number, title, word_count")
        .eq("project_id", book_id)
        .order("number", { ascending: true });

      if (error) {
        return { content: [{ type: "text", text: `Erreur : ${error.message}` }], isError: true };
      }

      if (!data || data.length === 0) {
        return { content: [{ type: "text", text: "Aucun chapitre trouvé pour ce projet." }] };
      }

      const list = data
        .map((ch) => `- Position ${ch.number} : ${ch.title} (${ch.word_count || 0} mots)`)
        .join("\n");
      return { content: [{ type: "text", text: list }] };
    }
  );

  server.tool(
    "read_chapter",
    "Lire le contenu complet d'un chapitre spécifique",
    {
      book_id: z.string().describe("ID du projet"),
      chapter_number: z.number().int().min(1).describe("Position du chapitre dans le livre (voir list_chapters)"),
    },
    async ({ book_id, chapter_number }) => {
      const { data: project } = await supabase
        .from("projects")
        .select("id")
        .eq("id", book_id)
        .eq("user_id", userId)
        .maybeSingle();

      if (!project) {
        return { content: [{ type: "text", text: "Projet introuvable." }], isError: true };
      }

      const { data, error } = await supabase
        .from("chapters")
        .select("number, title, content, word_count")
        .eq("project_id", book_id)
        .eq("number", chapter_number)
        .maybeSingle();

      if (error) {
        return { content: [{ type: "text", text: `Erreur : ${error.message}` }], isError: true };
      }
      if (!data) {
        return { content: [{ type: "text", text: `Chapitre ${chapter_number} introuvable.` }], isError: true };
      }

      return {
        content: [{
          type: "text",
          text: `# Position ${data.number} — ${data.title}\n(${data.word_count || 0} mots)\n\n${data.content || "(contenu vide)"}`
        }]
      };
    }
  );

  server.tool(
    "generate_cover",
    "Générer une couverture IA pour un livre et l'appliquer automatiquement au projet. Utilise le moteur gratuit par défaut.",
    {
      book_id: z.string().describe("ID du projet"),
      prompt: z.string().optional().describe("Description visuelle optionnelle pour guider la génération de l'image (ex: 'Un paysage africain au coucher du soleil')"),
      engine: z.enum(["free", "premium"]).optional().describe("Moteur de génération : 'free' (par défaut) ou 'premium' (coûte des crédits)"),
    },
    async ({ book_id, prompt, engine }) => {
      // Vérifier que le projet appartient à l'utilisateur
      const { data: project } = await supabase
        .from("projects")
        .select("id, title")
        .eq("id", book_id)
        .eq("user_id", userId)
        .maybeSingle();

      if (!project) {
        return { content: [{ type: "text", text: "Projet introuvable." }], isError: true };
      }

      // Appeler l'API interne de génération de couverture
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('.supabase.co', '') || 'http://localhost:3000';
      try {
        const res = await fetch(`${siteUrl}/api/generate-cover`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: book_id,
            engine: engine || "free",
            prompt: prompt || undefined,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Erreur inconnue" }));
          return { content: [{ type: "text", text: `Erreur de génération : ${err.error || res.statusText}` }], isError: true };
        }

        const data = await res.json();
        const coverUrl = data.url;

        // Appliquer la couverture au projet
        const { error: updateError } = await supabase
          .from("projects")
          .update({ cover_url: coverUrl })
          .eq("id", book_id)
          .eq("user_id", userId);

        if (updateError) {
          return { content: [{ type: "text", text: `Couverture générée mais erreur lors de l'application : ${updateError.message}. URL : ${coverUrl}` }], isError: true };
        }

        return {
          content: [{
            type: "text",
            text: `Couverture générée et appliquée avec succès au projet "${project.title}" ! Moteur utilisé : ${data.model || engine || "free"}.`
          }]
        };
      } catch (e) {
        return { content: [{ type: "text", text: `Erreur lors de la génération : ${e instanceof Error ? e.message : String(e)}` }], isError: true };
      }
    }
  );

  server.tool(
    "export_pdf",
    "Exporter le livre complet en PDF (format numérique ou impression), à partir de tous les chapitres enregistrés. Retourne un lien de téléchargement.",
    {
      book_id: z.string().describe("ID du projet"),
      format: z.enum(["digital", "print"]).optional().describe("Format d'export : 'digital' (par défaut) ou 'print' (marges pour impression)"),
    },
    async ({ book_id, format }) => {
      // Vérifier que le projet appartient à l'utilisateur
      const { data: project } = await supabase
        .from("projects")
        .select("id, title, subtitle, category, cover_url, work_type")
        .eq("id", book_id)
        .eq("user_id", userId)
        .maybeSingle();

      if (!project) {
        return { content: [{ type: "text", text: "Projet introuvable." }], isError: true };
      }

      // Tous les chapitres enregistrés, dans l'ordre : l'export reflète
      // exactement ce qui a été écrit, via MCP comme depuis l'éditeur.
      const { data: chapters, error: chErr } = await supabase
        .from("chapters")
        .select("number, title, content, word_count")
        .eq("project_id", book_id)
        .order("number", { ascending: true });

      if (chErr) {
        return { content: [{ type: "text", text: `Erreur : ${chErr.message}` }], isError: true };
      }

      const written = (chapters || []).filter((ch) => (ch.content || "").replace(/<[^>]*>/g, "").trim().length > 0);
      if (written.length === 0) {
        return { content: [{ type: "text", text: "Aucun chapitre à exporter. Écrivez d'abord quelques chapitres !" }] };
      }

      const exportFormat = format === "print" ? "print" : "digital";
      try {
        // Rendu direct, sans passer par /api/export/pdf : cette route exige
        // une session navigateur, que l'appel MCP n'a pas (401 systématique).
        const pdfBuffer = await renderBookPdf({
          title: project.title,
          subtitle: project.subtitle,
          category: project.category,
          coverUrl: project.cover_url,
          format: exportFormat,
          workType: project.work_type,
          chapters: written.map((ch) => ({ number: ch.number, title: ch.title, content: ch.content || "" })),
        });

        const sizeKb = Math.round(pdfBuffer.length / 1024);
        const words = written.reduce((sum, ch) => sum + (Number(ch.word_count) || 0), 0);
        const fileName = `exports/${userId}/${book_id}-${Date.now()}.pdf`;

        const { error: uploadErr } = await supabase.storage
          .from("covers")
          .upload(fileName, pdfBuffer, { contentType: "application/pdf", upsert: true });

        if (uploadErr) {
          return { content: [{ type: "text", text: `PDF généré (${written.length} chapitres, ${sizeKb} Ko) mais impossible de l'héberger pour téléchargement. Utilisez l'export depuis le tableau de bord Iris.` }] };
        }

        const { data: pub } = supabase.storage.from("covers").getPublicUrl(fileName);

        return {
          content: [{
            type: "text",
            text: `PDF exporté avec succès !\n- Livre : "${project.title}"\n- ${written.length} chapitre(s), ${words} mots\n- Format : ${exportFormat}\n- Taille : ${sizeKb} Ko\n- Téléchargement : ${pub?.publicUrl || ""}`,
          }],
        };
      } catch (e) {
        return { content: [{ type: "text", text: `Erreur lors de l'export : ${e instanceof Error ? e.message : String(e)}` }], isError: true };
      }
    }
  );

  return server;
}
