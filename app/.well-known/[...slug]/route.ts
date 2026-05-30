import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
    return new Response(JSON.stringify({ error: 'no_oauth', detail: 'This MCP server uses URL-token auth, not OAuth.' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
}

export async function POST(_req: NextRequest) {
    return new Response(JSON.stringify({ error: 'no_oauth' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
}
