import { TOOL_DEFINITIONS, callTool } from './tools';
import { MetaApiError } from '../meta-ads';

const SERVER_INFO = { name: 'n8nar-meta-ads-mcp', version: '1.0.0' };
const DEFAULT_PROTOCOL = '2024-11-05';

interface JsonRpcRequest {
  jsonrpc: string;
  id?: string | number | null;
  method: string;
  params?: any;
}

function result(id: any, data: any) {
  return { jsonrpc: '2.0', id, result: data };
}

function rpcError(id: any, code: number, message: string, data?: any) {
  return { jsonrpc: '2.0', id, error: { code, message, ...(data ? { data } : {}) } };
}

/**
 * Handle a single JSON-RPC message.
 * Returns the response object, or null for notifications (no id) which get a 202.
 */
export async function handleRpc(req: JsonRpcRequest): Promise<object | null> {
  const { id, method, params } = req || ({} as JsonRpcRequest);

  switch (method) {
    case 'initialize':
      return result(id, {
        protocolVersion: params?.protocolVersion || DEFAULT_PROTOCOL,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
      });

    case 'notifications/initialized':
    case 'notifications/cancelled':
      return null; // notification, no response

    case 'ping':
      return result(id, {});

    case 'tools/list':
      return result(id, { tools: TOOL_DEFINITIONS });

    case 'tools/call': {
      const name = params?.name;
      const args = params?.arguments ?? {};
      if (!name) return rpcError(id, -32602, 'Missing tool name');
      try {
        const out = await callTool(name, args);
        return result(id, {
          content: [{ type: 'text', text: JSON.stringify(out, null, 2) }],
          isError: false,
        });
      } catch (e: any) {
        const msg = e instanceof MetaApiError ? e.toUserMessage() : e?.message || String(e);
        // MCP convention: tool failures come back as a result with isError:true
        return result(id, {
          content: [{ type: 'text', text: `❌ خطأ: ${msg}` }],
          isError: true,
        });
      }
    }

    default:
      return rpcError(id, -32601, `Method not found: ${method}`);
  }
}

/** Handle either a single request or a JSON-RPC batch. */
export async function dispatch(body: any): Promise<{ status: number; payload: any }> {
  if (Array.isArray(body)) {
    const responses = (await Promise.all(body.map((m) => handleRpc(m)))).filter(Boolean);
    if (responses.length === 0) return { status: 202, payload: null };
    return { status: 200, payload: responses };
  }
  const res = await handleRpc(body);
  if (res === null) return { status: 202, payload: null };
  return { status: 200, payload: res };
}
