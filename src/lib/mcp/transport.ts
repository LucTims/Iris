import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";

/**
 * Transport MCP "un message = une réponse", sans aucun état partagé entre
 * requêtes (pas de Map en mémoire, pas de session à recoller). Chaque
 * requête HTTP crée son propre McpServer + son propre transport, ce qui la
 * rend compatible avec un environnement serverless (Vercel) où deux
 * requêtes successives peuvent être servies par des instances différentes.
 *
 * Les transports fournis par le SDK (SSEServerTransport,
 * StreamableHTTPServerTransport) sont conçus pour les objets Node
 * `http.IncomingMessage` / `http.ServerResponse` — pas pour les Request/
 * Response Fetch API des Route Handlers Next.js. Tenter de les adapter avec
 * un faux `ServerResponse` (comme l'implémentation précédente) échoue dès
 * que le SDK appelle `res.writeHead(...)`, absent du mock. Ce transport
 * implémente directement l'interface abstraite `Transport` du SDK en
 * termes de JSON, sans dépendre de l'API Node http.
 */
export class StatelessHttpTransport implements Transport {
  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage) => void;

  private pendingResolve: ((message: JSONRPCMessage) => void) | null = null;

  async start(): Promise<void> {
    // Rien à initialiser : pas de connexion persistante à ouvrir.
  }

  async send(message: JSONRPCMessage): Promise<void> {
    this.pendingResolve?.(message);
    this.pendingResolve = null;
  }

  async close(): Promise<void> {
    this.onclose?.();
  }

  /** Injecte un message JSON-RPC entrant dans le serveur MCP connecté. */
  deliver(message: JSONRPCMessage): void {
    this.onmessage?.(message);
  }

  /** Résout dès que le serveur appelle `send()` en réponse au message livré. */
  waitForResponse(): Promise<JSONRPCMessage> {
    return new Promise((resolve) => {
      this.pendingResolve = resolve;
    });
  }
}
