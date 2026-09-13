import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// Global map to store active MCP sessions (Works on standard Node.js server, NOT on Vercel serverless functions)
// For Vercel/Serverless deployments, it is recommended to host the MCP server as a separate Express/Hono app.
export const activeTransports = new Map<string, SSEServerTransport>();

export async function GET(request: Request) {
  console.log("Nouvelle connexion MCP entrante (SSE)");
  
  // 1. TODO: Vérifier le header Authorization (Bearer Token)
  // const authHeader = request.headers.get("Authorization");
  // ... check token in Supabase ...

  const sessionId = crypto.randomUUID();
  let transport: SSEServerTransport;

  const stream = new ReadableStream({
    start(controller) {
      // Create a custom response wrapper that SSEServerTransport can write to
      const mockResponse = {
        setHeader: (name: string, value: string) => {},
        writeHead: (status: number, headers: any) => {},
        write: (chunk: string) => {
          controller.enqueue(new TextEncoder().encode(chunk));
        },
        end: () => {
          controller.close();
        },
        on: (event: string, cb: any) => {
          if (event === "close") {
            request.signal.addEventListener("abort", cb);
          }
        },
      };

      // @ts-ignore - Adaptateur basique pour Next.js App Router
      transport = new SSEServerTransport("/api/mcp/messages?sessionId=" + sessionId, mockResponse);
      activeTransports.set(sessionId, transport);

      // Initialize the MCP Server logic for this connection
      const server = new McpServer({
        name: "Livre-Genie-MCP",
        version: "1.0.0",
      });

      // --- DÉFINITION DES OUTILS MCP ---

      // Outil 1 : Créer un livre
      server.tool("create_book", "Créer un nouveau projet de livre", 
        {
          title: z.string().describe("Titre du livre"),
          synopsis: z.string().describe("Synopsis ou résumé"),
        },
        async ({ title, synopsis }) => {
          // TODO: Insérer dans Supabase
          return {
            content: [{ type: "text", text: `Le livre "${title}" a été créé avec succès.` }]
          };
        }
      );

      // Outil 2 : Rédiger un chapitre
      server.tool("write_chapter", "Sauvegarder le contenu d'un chapitre",
        {
          book_id: z.string().describe("ID du livre"),
          chapter_number: z.number().describe("Numéro du chapitre"),
          content: z.string().describe("Contenu texte du chapitre"),
        },
        async ({ book_id, chapter_number, content }) => {
          // TODO: Insérer dans Supabase
          return {
            content: [{ type: "text", text: `Chapitre ${chapter_number} sauvegardé.` }]
          };
        }
      );

      // Connecter le transport au serveur
      server.connect(transport);
    },
    cancel() {
      console.log("Connexion MCP fermée", sessionId);
      activeTransports.delete(sessionId);
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
