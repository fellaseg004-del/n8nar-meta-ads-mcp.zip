import { NextRequest } from 'next/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const redirectUri = url.searchParams.get('redirect_uri');
  const state = url.searchParams.get('state');
  if (!redirectUri) {
    return new Response(JSON.stringify({ error: 'invalid_request' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  const code = 'authcode_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  const dest = new URL(redirectUri);
  dest.searchParams.set('code', code);
  if (state) dest.searchParams.set('state', state);
  return new Response(null, { status: 302, headers: { Location: dest.toString(), 'Cache-Control': 'no-store' } });
}
