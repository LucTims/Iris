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

  return server;
}
