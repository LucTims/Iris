import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

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
    "Créer un nouveau projet de livre",
    {
      title: z.string().describe("Titre du livre"),
      synopsis: z.string().optional().describe("Synopsis ou résumé"),
      category: z.string().optional().describe("Catégorie / genre"),
      tone: z.string().optional().describe("Ton du livre"),
      audience: z.string().optional().describe("Public visé"),
    },
    async ({ title, synopsis, category, tone, audience }) => {
      const { data, error } = await supabase
        .from("projects")
        .insert({
          user_id: userId,
          title,
          synopsis: synopsis ?? null,
          category: category ?? null,
          tone: tone ?? null,
          audience: audience ?? null,
        })
        .select("id")
        .single();

      if (error) {
        return { content: [{ type: "text", text: `Erreur lors de la création : ${error.message}` }], isError: true };
      }

      return {
        content: [{ type: "text", text: `Le livre "${title}" a été créé avec succès (id: ${data.id}).` }],
      };
    }
  );

  server.tool(
    "write_chapter",
    "Créer ou mettre à jour le contenu d'un chapitre d'un projet existant",
    {
      book_id: z.string().describe("ID du livre"),
      chapter_number: z.number().int().min(1).describe("Numéro du chapitre"),
      title: z.string().describe("Titre du chapitre"),
      content: z.string().describe("Contenu texte du chapitre"),
    },
    async ({ book_id, chapter_number, title, content }) => {
      // Vérifie que le projet appartient bien à l'utilisateur de la clé API
      // avant d'écrire quoi que ce soit : sans ce contrôle, n'importe quelle
      // clé valide pourrait écrire dans le livre d'un autre utilisateur en
      // devinant son book_id.
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .select("id")
        .eq("id", book_id)
        .eq("user_id", userId)
        .maybeSingle();

      if (projectError) {
        return { content: [{ type: "text", text: `Erreur : ${projectError.message}` }], isError: true };
      }
      if (!project) {
        return { content: [{ type: "text", text: "Projet introuvable." }], isError: true };
      }

      const wordCount = content.trim().length > 0 ? content.trim().split(/\s+/).length : 0;

      const { error } = await supabase
        .from("chapters")
        .upsert(
          {
            project_id: book_id,
            number: chapter_number,
            title,
            content,
            word_count: wordCount,
          },
          { onConflict: "project_id,number" }
        );

      if (error) {
        return { content: [{ type: "text", text: `Erreur lors de la sauvegarde : ${error.message}` }], isError: true };
      }

      return { content: [{ type: "text", text: `Chapitre ${chapter_number} sauvegardé.` }] };
    }
  );

  server.tool(
    "get_wallet_balance",
    "Consulter le solde de crédits (wallet) de l'utilisateur",
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

      return { content: [{ type: "text", text: `Solde actuel : ${data.balance} crédits.` }] };
    }
  );

  server.tool(
    "list_chapters",
    "Lister tous les chapitres d'un livre/projet, triés par numéro",
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
        .map((ch) => `- Chapitre ${ch.number} : ${ch.title} (${ch.word_count || 0} mots)`)
        .join("\n");
      return { content: [{ type: "text", text: list }] };
    }
  );

  server.tool(
    "read_chapter",
    "Lire le contenu complet d'un chapitre spécifique",
    {
      book_id: z.string().describe("ID du projet"),
      chapter_number: z.number().int().min(1).describe("Numéro du chapitre"),
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
          text: `# Chapitre ${data.number} — ${data.title}\n(${data.word_count || 0} mots)\n\n${data.content || "(contenu vide)"}`
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
    "Exporter un livre complet en PDF (format numérique ou impression). Retourne un lien de téléchargement.",
    {
      book_id: z.string().describe("ID du projet"),
      format: z.enum(["digital", "print"]).optional().describe("Format d'export : 'digital' (par défaut) ou 'print' (marges pour impression)"),
    },
    async ({ book_id, format }) => {
      // Vérifier que le projet appartient à l'utilisateur
      const { data: project } = await supabase
        .from("projects")
        .select("id, title, subtitle, category, cover_url")
        .eq("id", book_id)
        .eq("user_id", userId)
        .maybeSingle();

      if (!project) {
        return { content: [{ type: "text", text: "Projet introuvable." }], isError: true };
      }

      // Récupérer tous les chapitres du projet
      const { data: chapters, error: chErr } = await supabase
        .from("chapters")
        .select("number, title, content")
        .eq("project_id", book_id)
        .order("number", { ascending: true });

      if (chErr) {
        return { content: [{ type: "text", text: `Erreur : ${chErr.message}` }], isError: true };
      }

      if (!chapters || chapters.length === 0) {
        return { content: [{ type: "text", text: "Aucun chapitre à exporter. Écrivez d'abord quelques chapitres !" }] };
      }

      // Appeler l'API interne d'export PDF
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      try {
        const res = await fetch(`${siteUrl}/api/export/pdf`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: project.title,
            subtitle: project.subtitle,
            category: project.category,
            coverUrl: project.cover_url,
            format: format || "digital",
            chapters: chapters.map((ch) => ({
              number: ch.number,
              title: ch.title,
              content: ch.content,
            })),
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Erreur inconnue" }));
          return { content: [{ type: "text", text: `Erreur d'export : ${err.error || res.statusText}` }], isError: true };
        }

        // Le PDF est généré, on le stocke dans Supabase Storage pour donner un lien
        const pdfBuffer = Buffer.from(await res.arrayBuffer());
        const fileName = `exports/${userId}/${book_id}-${Date.now()}.pdf`;

        const { error: uploadErr } = await supabase.storage
          .from("covers")
          .upload(fileName, pdfBuffer, { contentType: "application/pdf", upsert: true });

        if (uploadErr) {
          return { content: [{ type: "text", text: `PDF généré (${chapters.length} chapitres, ${Math.round(pdfBuffer.length / 1024)} Ko) mais impossible de l'héberger pour téléchargement. Utilisez l'export depuis le tableau de bord Iris.` }] };
        }

        const { data: pub } = supabase.storage.from("covers").getPublicUrl(fileName);
        const downloadUrl = pub?.publicUrl || "";

        return {
          content: [{
            type: "text",
            text: `PDF exporté avec succès !\n- Livre : "${project.title}"\n- ${chapters.length} chapitres\n- Format : ${format || "digital"}\n- Taille : ${Math.round(pdfBuffer.length / 1024)} Ko\n- Téléchargement : ${downloadUrl}`
          }]
        };
      } catch (e) {
        return { content: [{ type: "text", text: `Erreur lors de l'export : ${e instanceof Error ? e.message : String(e)}` }], isError: true };
      }
    }
  );

  return server;
}
