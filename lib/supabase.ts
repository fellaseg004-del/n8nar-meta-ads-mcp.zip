import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

/**
 * Lazily create a Supabase client using the service-role key.
 * Returns null if env is not configured so that a missing Supabase
 * setup never crashes a tool call (logging/aliases degrade gracefully).
 */
export function getSupabase(): SupabaseClient | null {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || url.includes('<your-project-ref>')) return null;
  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
}

/** Normalize any input to the canonical `act_<id>` form. */
function toActId(value: string): string {
  const raw = value.startsWith('act_') ? value.slice(4) : value;
  return `act_${raw}`;
}

/**
 * Resolve a human alias OR a raw account id to a canonical `act_<id>`.
 * - "act_123" / "123"  -> "act_123"
 * - "متجر الشنط"        -> looks up meta_account_aliases, else returns input
 */
export async function resolveAlias(input: string): Promise<string> {
  if (!input) return input;
  const normalized = input.startsWith('act_') ? input.slice(4) : input;
  if (/^\d+$/.test(normalized)) return toActId(normalized);

  const sb = getSupabase();
  if (!sb) return input;
  try {
    const { data } = await sb
      .from('meta_account_aliases')
      .select('ad_account_id')
      .eq('alias', input)
      .maybeSingle();
    if (data?.ad_account_id) return toActId(data.ad_account_id);
  } catch {
    /* ignore — fall through to raw input */
  }
  return input;
}

export interface ToolCallLog {
  tool_name: string;
  arguments?: unknown;
  result?: unknown;
  error?: string | null;
  duration_ms?: number;
  ad_account_id?: string | null;
}

/** Append one row to meta_tool_calls. Never throws. */
export async function logToolCall(entry: ToolCallLog): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  try {
    await sb.from('meta_tool_calls').insert({
      tool_name: entry.tool_name,
      arguments: entry.arguments ?? null,
      result: entry.result ?? null,
      error: entry.error ?? null,
      duration_ms: entry.duration_ms ?? null,
      ad_account_id: entry.ad_account_id ?? null,
    });
  } catch {
    /* logging must never break a tool call */
  }
}
