import { NextRequest } from 'next/server';
import { dispatch } from '../../../../lib/mcp/rpc-handler';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/** Constant-time comparison of the URL token against MCP_BEARER_TOKEN. */
function tokenOk(token: string): boolean {
  const expected = process.env.MCP_BEARER_TOKEN;
  if (!expected || token.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < token.length; i++) {
    diff |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

function unauthorized() {
  return new Response(
    JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32001, message: 'Unauthorized' } }),
    { status: 401, headers: JSON_HEADERS }
  );
}

export async function POST(req: NextRequest, ctx: { params: { token: string } }) {
  const { token } = ctx.params;
  if (!tokenOk(token)) return unauthorized();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }),
      { status: 400, headers: JSON_HEADERS }
    );
  }

  const { status, payload } = await dispatch(body);
  if (payload === null) return new Response(null, { status });
  return new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS });
}

// Some clients probe with GET before connecting.
export async function GET(_req: NextRequest, ctx: { params: { token: string } }) {
  if (!tokenOk(ctx.params.token)) return unauthorized();
  return new Response(
    JSON.stringify({ status: 'ok', server: 'n8nar-meta-ads-mcp', transport: 'json-rpc over POST' }),
    { status: 200, headers: JSON_HEADERS }
  );
}
