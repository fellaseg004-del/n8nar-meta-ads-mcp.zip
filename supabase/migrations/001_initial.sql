-- ============================================================
--  001_initial.sql  —  n8nar-meta-ads-mcp
--  شغّله من: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

-- (1) Account aliases: اسم بشري لكل ad account عشان تنادي عليه بسهولة
create table if not exists public.meta_account_aliases (
  id uuid primary key default gen_random_uuid(),
  ad_account_id text not null unique,
  alias text not null,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- (2) Audit log: كل tool call بيتسجل هنا
create table if not exists public.meta_tool_calls (
  id uuid primary key default gen_random_uuid(),
  tool_name text not null,
  arguments jsonb,
  result jsonb,
  error text,
  duration_ms integer,
  ad_account_id text,
  created_at timestamptz default now()
);

create index if not exists idx_meta_tool_calls_created_at
  on public.meta_tool_calls (created_at desc);
create index if not exists idx_meta_tool_calls_tool_name
  on public.meta_tool_calls (tool_name);
create index if not exists idx_meta_account_aliases_alias
  on public.meta_account_aliases (alias);

-- (3) RLS — مفعّل. الوصول بيتم عن طريق الـ service_role key من السيرفر بس،
--     واللي بيتخطى الـ RLS تلقائيًا. مفيش policies للـ anon = مفيش وصول عام.
alter table public.meta_account_aliases enable row level security;
alter table public.meta_tool_calls enable row level security;
