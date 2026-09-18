import { NextResponse } from "next/server";
import type { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";
import { resolveApiKeyUser } from "@/lib/mcp/auth";
import { buildMcpServer } from "@/lib/mcp/server";
import { StatelessHttpTransport } from "@/lib/mcp/transport";

// Endpoint MCP "Streamable HTTP" à un seul point d'entrée, sans état
// partagé entre requêtes : chaque POST traite un message JSON-RPC complet
// et renvoie sa réponse. Remplace l'ancien couple SSE + /messages qui
// s'appuyait sur une Map en mémoire (incompatible avec le serverless
// Vercel : GET et POST peuvent atterrir sur des instances différentes) et
// sur un mock de réponse Node incomplet qui faisait échouer chaque message.
const RESPONSE_TIMEOUT_MS = 25_000;

export async function POST(request: Request) {
  const auth = await resolveApiKeyUser(request);
  if (!auth) {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        error: { code: -32001, message: "Non autorisé : clé API MCP manquante ou invalide." },
      },
      { status: 401 }
    );
  }

  let message: JSONRPCMessage;
  try {
    message = await request.json();
  } catch {
    return NextResponse.json(
      { jsonrpc: "2.0", error: { code: -32700, message: "Corps de requête JSON invalide." } },
      { status: 400 }
    );
  }

  const server = buildMcpServer(auth.userId);
  const transport = new StatelessHttpTransport();
  await server.connect(transport);

  // Une notification JSON-RPC n'a pas d'"id" et n'attend aucune réponse.
  const isNotification = !("id" in message) || message.id === undefined || message.id === null;

  if (isNotification) {
    transport.deliver(message);
    return new NextResponse(null, { status: 202 });
  }

  const responsePromise = transport.waitForResponse();
  transport.deliver(message);

  const timeout = new Promise<"timeout">((resolve) =>
    setTimeout(() => resolve("timeout"), RESPONSE_TIMEOUT_MS)
  );

  const result = await Promise.race([responsePromise, timeout]);
  await transport.close();

  if (result === "timeout") {
    return NextResponse.json(
      { jsonrpc: "2.0", error: { code: -32000, message: "Le serveur MCP n'a pas répondu à temps." } },
      { status: 504 }
    );
  }

  return NextResponse.json(result);
}

export async function GET() {
  return NextResponse.json(
    {
      error:
        "Ce serveur MCP est stateless (transport Streamable HTTP). Envoyez vos messages JSON-RPC en POST sur cette même URL.",
    },
    { status: 405 }
  );
}
