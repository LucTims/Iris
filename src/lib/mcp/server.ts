import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { COVER_IMAGE_COINS, COVER_STANDARD_COINS, MCP_COINS_PER_PAGE, WORDS_PER_PAGE } from "@/lib/ai/pricing";
import { renderBookPdfWithLayout, type BookLayoutSummary } from "@/lib/export/pdfBook";
import { EXPORT_BODY_FONTS, EXPORT_HEADING_FONTS, PAGE_FORMATS, sanitizeExportStyle, type ExportStyle } from "@/lib/export/exportStyle";
import { writeChapterWithBilling } from "@/lib/mcp/writeChapter";
import { generateCoverForUser } from "@/lib/cover/generateCover";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.irisboom.online";
const MCP_PRICE_NOTE = `L'écriture via MCP coûte ${MCP_COINS_PER_PAGE} pièces par page ajoutée (1 page ≈ ${WORDS_PER_PAGE} mots) ; réenregistrer ou corriger un chapitre sans l'allonger est gratuit.`;

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const FONT_CHOICES = Array.from(new Set([...EXPORT_BODY_FONTS, ...EXPORT_HEADING_FONTS].map((f) => f.label))).join(", ");
const FORMAT_CHOICES = PAGE_FORMATS.map((f) => `'${f.key}' (${f.label} : ${f.hint})`).join(", ");

const exportStyleSchema = {
  page_format: z.string().optional().describe(`Format de page : ${FORMAT_CHOICES}. Par défaut : a4 (ou 6x9 si format = 'print').`),
  body_font: z.string().optional().describe(`Police du texte. Au choix : ${FONT_CHOICES}. Par défaut : choisie selon le genre du livre.`),
  heading_font: z.string().optional().describe("Police des titres (même liste que body_font)."),
  accent_color: z.string().optional().describe("Couleur d'accent au format #rrggbb (fleurons, filets, étiquettes « Chapitre », sommaire). Par défaut #b08d57 (or antique)."),
  include_toc: z.boolean().optional().describe("Ajouter un sommaire paginé (chapitres + intertitres ##) en tête du livre. Par défaut : oui."),
};

function styleFromArgs(args: { page_format?: string; body_font?: string; heading_font?: string; accent_color?: string; include_toc?: boolean }): { style: ExportStyle; ignored: string[] } {
  const style = sanitizeExportStyle({
    pageFormat: args.page_format,
    bodyFont: args.body_font,
    headingFont: args.heading_font,
    accentColor: args.accent_color,
    includeToc: args.include_toc ?? true,
  });
  const ignored: string[] = [];
  if (args.page_format && !style.pageFormat) ignored.push(`format de page « ${args.page_format} »`);
  if (args.body_font && !style.bodyFont) ignored.push(`police « ${args.body_font} »`);
  if (args.heading_font && !style.headingFont) ignored.push(`police de titres « ${args.heading_font} »`);
  if (args.accent_color && !style.accentColor) ignored.push(`couleur « ${args.accent_color} »`);
  return { style, ignored };
}

function describeLayout(layout: BookLayoutSummary): string {
  const lines = layout.chapters.map((c) => {
    const span = c.startPage === null ? "page inconnue" : c.endPage && c.endPage > c.startPage ? `pages ${c.startPage}–${c.endPage}` : `page ${c.startPage}`;
    const pages = c.startPage !== null && c.endPage !== null ? c.endPage - c.startPage + 1 : null;
    const warn = pages === 1 ? " ⚠ chapitre très court (1 page)" : "";
    return `- ${c.title} : ${span}${c.sections ? `, ${c.sections} intertitre(s)` : ""}${warn}`;
  });
  return [
    `${layout.pageCount} pages au format ${layout.pageFormat}${layout.hasToc ? ", avec sommaire paginé" : ", sans sommaire"}.`,
    layout.firstBodyPage ? `Le texte commence page ${layout.firstBodyPage} (avant : couverture, page de titre, mentions${layout.hasToc ? ", sommaire" : ""}).` : "",
    ...lines,
  ].filter(Boolean).join("\n");
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
        .select("id, title, subtitle, author, category, synopsis, tone, audience, characters, instructions, status, work_type, cover_url")
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
      subtitle: z.string().optional().describe("Sous-titre"),
      author: z.string().optional().describe("Nom d'auteur affiché dans le livre (personne, pseudonyme ou maison d'édition)"),
      synopsis: z.string().optional().describe("Synopsis ou résumé"),
      category: z.string().optional().describe("Catégorie / genre"),
      tone: z.string().optional().describe("Ton du livre"),
      audience: z.string().optional().describe("Public visé"),
      work_type: z
        .enum(["livre", "guide", "ebook"])
        .optional()
        .describe("Forme de l'ouvrage, qui décide de la mise en page à l'export : 'livre' (roman, récit, essai), 'guide' (pratique, étapes), 'ebook' (court)"),
    },
    async ({ title, subtitle, author, synopsis, category, tone, audience, work_type }) => {
      const { data, error } = await supabase
        .from("projects")
        .insert({
          user_id: userId,
          title,
          subtitle: subtitle?.trim() || null,
          author: author?.trim() || null,
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
    "update_book",
    "Modifier la fiche d'un livre : titre, sous-titre, auteur, résumé, catégorie, ton, public, consignes. Seuls les champs fournis sont modifiés ; une chaîne vide efface la valeur (sauf le titre). L'auteur, le titre et le sous-titre apparaissent sur la page de titre, les mentions légales et les métadonnées des exports.",
    {
      book_id: z.string().describe("ID du livre"),
      title: z.string().optional().describe("Nouveau titre"),
      subtitle: z.string().optional().describe("Sous-titre"),
      author: z.string().optional().describe("Nom d'auteur affiché dans le livre"),
      synopsis: z.string().optional().describe("Résumé du livre"),
      category: z.string().optional().describe("Catégorie / genre"),
      tone: z.string().optional().describe("Ton"),
      audience: z.string().optional().describe("Public visé"),
      instructions: z.string().optional().describe("Consignes d'écriture permanentes pour Iris"),
    },
    async ({ book_id, ...fields }) => {
      const limits: Record<string, number> = { title: 300, subtitle: 300, author: 200, synopsis: 8000, category: 120, tone: 300, audience: 300, instructions: 8000 };
      const updates: Record<string, string | null> = {};
      for (const [key, raw] of Object.entries(fields)) {
        if (raw === undefined) continue;
        const value = String(raw).trim();
        if (key === "title" && !value) {
          return { content: [{ type: "text", text: "Le titre ne peut pas être vide." }], isError: true };
        }
        updates[key] = value ? value.slice(0, limits[key] ?? 300) : null;
      }
      if (Object.keys(updates).length === 0) {
        return { content: [{ type: "text", text: "Aucun champ à modifier : précisez au moins un champ (title, subtitle, author, synopsis…)." }], isError: true };
      }

      const { data, error } = await supabase
        .from("projects")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", book_id)
        .eq("user_id", userId)
        .select("id, title, subtitle, author, category, synopsis, tone, audience")
        .maybeSingle();

      if (error) {
        return { content: [{ type: "text", text: `Erreur : ${error.message}` }], isError: true };
      }
      if (!data) {
        return { content: [{ type: "text", text: "Projet introuvable." }], isError: true };
      }
      return {
        content: [{ type: "text", text: `Fiche mise à jour (${Object.keys(updates).join(", ")}) :\n${JSON.stringify(data, null, 2)}` }],
      };
    }
  );

  server.tool(
    "write_chapter",
    `Créer ou remplacer le contenu d'un chapitre. chapter_number est la position du chapitre dans le livre, telle que renvoyée par list_chapters (si le livre commence par un « Sommaire », celui-ci occupe la position 1 : écrivez alors le premier chapitre en position 2). Le contenu est accepté en texte brut, Markdown ou HTML : il est converti automatiquement au format du manuscrit. Mise en forme disponible en Markdown : intertitres ## et ### (les ## alimentent le sommaire paginé), listes, **gras**, *italique*, citations « > », « --- » pour un changement de scène, tableaux « | Colonne | Colonne | » avec ligne « |---|---| » sous l'en-tête, et blocs mis en valeur : « > [!INFO] », « > [!ATTENTION] », « > [!CONSEIL] », « > [!EXEMPLE] » (encadré, titre facultatif sur la même ligne, texte sur les lignes « > » suivantes), « > [!CHIFFRE] 46 sociétés cotées » (chiffre clé) et « > [!CITATION] Texte » (citation mise en avant). Utilisez-les avec mesure : 1 à 3 blocs par chapitre. Le titre est ajouté en tête du chapitre : inutile de le répéter dans le contenu. Écrivez un seul chapitre par appel. ${MCP_PRICE_NOTE} Si le solde est insuffisant, rien n'est enregistré.`,
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
    `Générer une couverture IA pour un livre et l'appliquer automatiquement au projet. Utilise le moteur standard par défaut (${COVER_STANDARD_COINS} pièces).`,
    {
      book_id: z.string().describe("ID du projet"),
      prompt: z.string().optional().describe("Description visuelle optionnelle pour guider la génération de l'image (ex: 'Un paysage africain au coucher du soleil')"),
      engine: z.enum(["free", "premium"]).optional().describe(`Moteur de génération : 'free' (par défaut, moteur standard, ${COVER_STANDARD_COINS} pièces) ou 'premium' (${COVER_IMAGE_COINS} pièces)`),
    },
    async ({ book_id, prompt, engine }) => {
      // Appel DIRECT de la logique partagée, avec l'identité de la clé API :
      // l'ancien fetch vers /api/generate-cover partait sans cookies et la
      // route, qui exige une session, répondait 401 à chaque appel MCP.
      // Propriété du projet, solde, débit des pièces (client service-role
      // explicite) et application de la couverture sont gérés par
      // generateCoverForUser.
      const requested = engine === "premium" ? "premium" : "free";
      try {
        const result = await generateCoverForUser(
          userId,
          { projectId: book_id, engine: requested, prompt: prompt || undefined },
          { db: supabase, storage: supabase, applyToProject: true }
        );

        if (!result.ok) {
          const hint = result.status === 402 ? ` Rechargez des pièces sur ${SITE_URL}/pricing puis réessayez.` : "";
          return { content: [{ type: "text", text: `Erreur de génération : ${result.error}${hint}` }], isError: true };
        }

        if (!result.applied) {
          return {
            content: [{
              type: "text",
              text: `Couverture générée mais erreur lors de l'application : ${result.applyError || "raison inconnue"}. URL : ${result.url}`,
            }],
            isError: true,
          };
        }

        const billing = result.charged > 0
          ? `${result.charged} pièces débitées`
          : result.downgraded
            ? `aucun moteur premium disponible : image du moteur standard, tarif standard (${COVER_STANDARD_COINS} pièces) débité au lieu du forfait premium`
            : `moteur standard (${COVER_STANDARD_COINS} pièces)`;
        return {
          content: [{
            type: "text",
            text: `Couverture générée et appliquée avec succès au projet "${result.project?.title ?? book_id}" ! Moteur utilisé : ${result.model} ; ${billing}. URL : ${result.url}`,
          }],
        };
      } catch (e) {
        return { content: [{ type: "text", text: `Erreur lors de la génération : ${e instanceof Error ? e.message : String(e)}` }], isError: true };
      }
    }
  );

  // Charge le livre enregistré (fiche + chapitres rédigés) pour l'export ou l'aperçu.
  type ExportRow = { number: number; title: string; content: string | null; word_count: number | null };
  type LoadedBook =
    | { error: string }
    | { project: { id: string; title: string; subtitle: string | null; author: string | null; category: string | null; cover_url: string | null; work_type: string | null }; written: ExportRow[] };
  async function loadBookForExport(bookId: string): Promise<LoadedBook> {
    const { data: project } = await supabase
      .from("projects")
      .select("id, title, subtitle, author, category, cover_url, work_type")
      .eq("id", bookId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!project) return { error: "Projet introuvable." };

    const { data: chapters, error: chErr } = await supabase
      .from("chapters")
      .select("number, title, content, word_count")
      .eq("project_id", bookId)
      .order("number", { ascending: true });
    if (chErr) return { error: `Erreur : ${chErr.message}` };

    const written = (chapters || []).filter((ch) => (ch.content || "").replace(/<[^>]*>/g, "").trim().length > 0);
    return { project, written };
  }

  server.tool(
    "preview_layout",
    "Aperçu de la mise en page AVANT l'export : compose le PDF (sans le publier) et renvoie le nombre de pages, la page de début et de fin de chaque chapitre, le nombre d'intertitres, la présence du sommaire, et signale les problèmes (chapitres très courts, fiche incomplète). Gratuit. Accepte les mêmes options de style que export_pdf.",
    {
      book_id: z.string().describe("ID du projet"),
      ...exportStyleSchema,
    },
    async ({ book_id, ...styleArgs }) => {
      const loaded = await loadBookForExport(book_id);
      if ("error" in loaded) return { content: [{ type: "text", text: loaded.error }], isError: true };
      const { project, written } = loaded;
      if (written.length === 0) {
        return { content: [{ type: "text", text: "Aucun chapitre rédigé : rien à mettre en page." }] };
      }
      const { style, ignored } = styleFromArgs(styleArgs);
      try {
        const { layout } = await renderBookPdfWithLayout({
          title: project.title,
          subtitle: project.subtitle,
          author: project.author,
          category: project.category,
          coverUrl: project.cover_url,
          workType: project.work_type,
          style,
          chapters: written.map((ch) => ({ number: ch.number, title: ch.title, content: ch.content || "" })),
        });
        const notes: string[] = [];
        if (!project.author) notes.push("Aucun auteur renseigné : utilisez update_book (author) pour qu'il apparaisse sur la page de titre.");
        if (!project.subtitle) notes.push("Pas de sous-titre (facultatif) : update_book (subtitle).");
        if (!project.cover_url) notes.push("Pas de couverture : la première page sera la page de titre (generate_cover pour en créer une).");
        if (ignored.length) notes.push(`Options ignorées (valeurs inconnues) : ${ignored.join(", ")}.`);
        return {
          content: [{
            type: "text",
            text: `Aperçu de « ${project.title} »${project.author ? ` — ${project.author}` : ""}\n${describeLayout(layout)}${notes.length ? `\n\nÀ vérifier :\n- ${notes.join("\n- ")}` : ""}`,
          }],
        };
      } catch (e) {
        return { content: [{ type: "text", text: `Erreur lors de la mise en page : ${e instanceof Error ? e.message : String(e)}` }], isError: true };
      }
    }
  );

  server.tool(
    "export_pdf",
    "Exporter le livre complet en PDF à partir de tous les chapitres enregistrés, avec le style choisi (format de page, polices, couleur d'accent, sommaire). Retourne un lien de téléchargement et la carte des pages. Utilisez preview_layout d'abord pour contrôler la mise en page.",
    {
      book_id: z.string().describe("ID du projet"),
      format: z.enum(["digital", "print"]).optional().describe("Raccourci : 'digital' (A4, par défaut) ou 'print' (6×9 po, marges d'impression). page_format est prioritaire."),
      ...exportStyleSchema,
    },
    async ({ book_id, format, ...styleArgs }) => {
      const loaded = await loadBookForExport(book_id);
      if ("error" in loaded) return { content: [{ type: "text", text: loaded.error }], isError: true };
      const { project, written } = loaded;
      if (written.length === 0) {
        return { content: [{ type: "text", text: "Aucun chapitre à exporter. Écrivez d'abord quelques chapitres !" }] };
      }

      const exportFormat = format === "print" ? "print" : "digital";
      const { style, ignored } = styleFromArgs(styleArgs);
      try {
        // Rendu direct, sans passer par /api/export/pdf : cette route exige
        // une session navigateur, que l'appel MCP n'a pas (401 systématique).
        const { buffer: pdfBuffer, layout } = await renderBookPdfWithLayout({
          title: project.title,
          subtitle: project.subtitle,
          author: project.author,
          category: project.category,
          coverUrl: project.cover_url,
          format: exportFormat,
          workType: project.work_type,
          style,
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
            text: `PDF exporté avec succès !\n- Livre : "${project.title}"${project.author ? ` — ${project.author}` : ""}\n- ${written.length} chapitre(s), ${words} mots\n- Taille : ${sizeKb} Ko\n- Téléchargement : ${pub?.publicUrl || ""}\n\nMise en page :\n${describeLayout(layout)}${ignored.length ? `\n\nOptions ignorées (valeurs inconnues) : ${ignored.join(", ")}.` : ""}`,
          }],
        };
      } catch (e) {
        return { content: [{ type: "text", text: `Erreur lors de l'export : ${e instanceof Error ? e.message : String(e)}` }], isError: true };
      }
    }
  );

  return server;
}
