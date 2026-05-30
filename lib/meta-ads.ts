import crypto from 'crypto';

const GRAPH = 'https://graph.facebook.com';

export function apiVersion(): string {
  return process.env.META_API_VERSION || 'v22.0';
}

function accessToken(): string {
  const t = process.env.META_ACCESS_TOKEN;
  if (!t) {
    throw new MetaApiError('META_ACCESS_TOKEN غير مضبوط في الـ environment variables', {
      status: 500,
    });
  }
  return t;
}

/** Structured Meta Graph API error. Always surfaces error_user_title / error_user_msg. */
export class MetaApiError extends Error {
  status: number;
  code?: number;
  errorSubcode?: number;
  errorType?: string;
  userTitle?: string;
  userMsg?: string;
  fbtraceId?: string;
  raw?: unknown;

  constructor(
    message: string,
    opts: {
      status?: number;
      code?: number;
      errorSubcode?: number;
      errorType?: string;
      userTitle?: string;
      userMsg?: string;
      fbtraceId?: string;
      raw?: unknown;
    } = {}
  ) {
    super(message);
    this.name = 'MetaApiError';
    this.status = opts.status ?? 0;
    this.code = opts.code;
    this.errorSubcode = opts.errorSubcode;
    this.errorType = opts.errorType;
    this.userTitle = opts.userTitle;
    this.userMsg = opts.userMsg;
    this.fbtraceId = opts.fbtraceId;
    this.raw = opts.raw;
  }

  /** A single human-readable line preferring Meta's user-facing fields. */
  toUserMessage(): string {
    const title = this.userTitle ? `${this.userTitle}: ` : '';
    const body = this.userMsg || this.message;
    const trace = this.fbtraceId ? ` (fbtrace_id: ${this.fbtraceId})` : '';
    return `${title}${body}${trace}`;
  }
}

/** Flatten a body object into form fields, JSON-stringifying nested objects/arrays. */
function toForm(body: Record<string, unknown>): URLSearchParams {
  const form = new URLSearchParams();
  for (const [k, v] of Object.entries(body)) {
    if (v === undefined || v === null) continue;
    form.append(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
  }
  return form;
}

async function readError(res: Response): Promise<MetaApiError> {
  let payload: any = null;
  try {
    payload = await res.json();
  } catch {
    /* non-JSON error body */
  }
  const e = payload?.error ?? {};
  return new MetaApiError(e.message || `Meta API request failed (HTTP ${res.status})`, {
    status: res.status,
    code: e.code,
    errorSubcode: e.error_subcode,
    errorType: e.type,
    userTitle: e.error_user_title,
    userMsg: e.error_user_msg,
    fbtraceId: e.fbtrace_id,
    raw: payload,
  });
}

function buildUrl(path: string, params?: Record<string, unknown>): string {
  const clean = path.replace(/^\//, '');
  const url = new URL(`${GRAPH}/${apiVersion()}/${clean}`);
  url.searchParams.set('access_token', accessToken());
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null) continue;
      url.searchParams.set(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
    }
  }
  return url.toString();
}

export async function metaGet<T = any>(
  path: string,
  params?: Record<string, unknown>
): Promise<T> {
  const res = await fetch(buildUrl(path, params), { method: 'GET' });
  if (!res.ok) throw await readError(res);
  return res.json();
}

export async function metaPost<T = any>(
  path: string,
  body: Record<string, unknown> = {}
): Promise<T> {
  const clean = path.replace(/^\//, '');
  const url = `${GRAPH}/${apiVersion()}/${clean}`;
  const form = toForm(body);
  form.append('access_token', accessToken());
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
  if (!res.ok) throw await readError(res);
  return res.json();
}

export async function metaDelete<T = any>(path: string): Promise<T> {
  const res = await fetch(buildUrl(path), { method: 'DELETE' });
  if (!res.ok) throw await readError(res);
  return res.json();
}

/**
 * Follow cursor-based pagination up to `maxItems` (default 200) or `maxPages`.
 * Returns the merged `data` array.
 */
export async function metaPaginate<T = any>(
  path: string,
  params: Record<string, unknown> = {},
  opts: { maxItems?: number; maxPages?: number } = {}
): Promise<T[]> {
  const maxItems = opts.maxItems ?? 200;
  const maxPages = opts.maxPages ?? 25;
  const pageSize = Math.min(Number(params.limit) || 50, maxItems);

  const out: T[] = [];
  let next: string | null = buildUrl(path, { ...params, limit: pageSize });
  let pages = 0;

  while (next && out.length < maxItems && pages < maxPages) {
    const res = await fetch(next, { method: 'GET' });
    if (!res.ok) throw await readError(res);
    const json: any = await res.json();
    if (Array.isArray(json.data)) out.push(...json.data);
    next = json.paging?.next ?? null;
    pages += 1;
  }
  return out.slice(0, maxItems);
}

// ---------------------------------------------------------------------------
//  PII hashing — Meta requires SHA-256 of normalized values for custom audiences
//  https://developers.facebook.com/docs/marketing-api/audiences/guides/custom-audiences
// ---------------------------------------------------------------------------

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

/** Lowercase + trim, then SHA-256. Returns null for empty input. */
export function hashNormalized(value?: string | null): string | null {
  if (value === undefined || value === null) return null;
  const v = String(value).trim().toLowerCase();
  if (!v) return null;
  return sha256(v);
}

/** Phones: strip everything except digits (keep country code), then SHA-256. */
export function hashPhone(value?: string | null): string | null {
  if (value === undefined || value === null) return null;
  const digits = String(value).replace(/[^0-9]/g, '');
  if (!digits) return null;
  return sha256(digits);
}
