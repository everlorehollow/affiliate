-- ============================================
-- SHOPIFY OAUTH TOKENS
-- Stores Admin API access tokens obtained via
-- the Authorization Code Grant flow.
-- ============================================
create table shopify_tokens (
  id uuid primary key default gen_random_uuid(),
  shop_domain text unique not null,
  access_token text not null,
  scope text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS: only service role can access
alter table shopify_tokens enable row level security;
