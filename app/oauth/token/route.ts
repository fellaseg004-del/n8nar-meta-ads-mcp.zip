import { NextRequest } from 'next/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const H = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' };
export async function POST(req: NextRequest) {
  try {
    const ct = req.headers.get('content-type') || '';
    if (ct.includes('application/json')) { await req.json(); } else { await req.text(); }
  } catch (e) {}
  const accessToken = 'mcp_at_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  const refreshToken = 'mcp_rt_' + Math.random().toString(36).slice(2);
  const body = {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: 31536000,
    refresh_token: refreshToken,
    scope: 'mcp',
  };
  return new Response(JSON.stringify(body), { status: 200, headers: H });
}
export async function OPTIONS() {
  return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': '*' } });
}
