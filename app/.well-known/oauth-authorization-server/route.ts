import { NextRequest } from 'next/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
function origin(req: NextRequest): string {
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
  return proto + '://' + host;
}
const H = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' };
export async function GET(req: NextRequest) {
  const base = origin(req);
  const body = {
    issuer: base,
    authorization_endpoint: base + '/oauth/authorize',
    token_endpoint: base + '/oauth/token',
    registration_endpoint: base + '/oauth/register',
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256', 'plain'],
    token_endpoint_auth_methods_supported: ['none', 'client_secret_post'],
    scopes_supported: ['mcp'],
  };
  return new Response(JSON.stringify(body), { status: 200, headers: H });
}
export async function OPTIONS() {
  return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': '*' } });
}
