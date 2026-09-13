import { activeTransports } from "../sse/route";

export async function POST(request: Request) {
  // Extract sessionId from URL query params
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId");

  if (!sessionId) {
    return new Response("Session ID missing", { status: 400 });
  }

  const transport = activeTransports.get(sessionId);
  if (!transport) {
    return new Response("Session not found", { status: 404 });
  }

  // Parse incoming JSON-RPC message from the client
  const body = await request.json();
  
  // Pass the message to the MCP transport handler
  // The transport will process the tool call/resource request and reply via the SSE stream
  try {
    await transport.handlePostMessage(request as unknown as any, {
       // Mock response object for the SDK to acknowledge the POST
       json: (data: any) => data
    } as any, body);
    
    return new Response("Accepted", { status: 202 });
  } catch (error) {
    console.error("Error handling MCP message:", error);
    return new Response("Internal Error", { status: 500 });
  }
}
