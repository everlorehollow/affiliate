-- ============================================
-- SYSTEM ERRORS (Error Monitoring)
-- ============================================
-- Tracks all system errors for admin visibility
-- and debugging purposes.

create table system_errors (
  id uuid primary key default gen_random_uuid(),

  -- Error classification
  error_type text not null,                     -- webhook_error, api_error, payout_error, etc.
  severity text default 'error',                -- info, warning, error, critical

  -- Error details
  message text not null,
  stack_trace text,

  -- Context
  source text not null,                         -- shopify_webhook, recharge_webhook, paypal_api, etc.
  endpoint text,                                -- API endpoint or webhook URL

  -- Related entities
  affiliate_id uuid references affiliates(id) on delete set null,
  order_id text,
  payout_id uuid references payouts(id) on delete set null,

  -- Request context
  request_payload jsonb,
  response_payload jsonb,
  http_status int,

  -- Metadata
  details jsonb,                                -- Additional context
  ip_address inet,
  user_agent text,

  -- Resolution tracking
  resolved boolean default false,
  resolved_at timestamptz,
  resolved_by text,                             -- Clerk user ID of admin who resolved
  resolution_notes text,

  -- Timestamps
  created_at timestamptz default now()
);

-- Indexes for efficient querying
create index idx_system_errors_type on system_errors(error_type);
create index idx_system_errors_severity on system_errors(severity);
create index idx_system_errors_source on system_errors(source);
create index idx_system_errors_resolved on system_errors(resolved);
create index idx_system_errors_created_at on system_errors(created_at desc);
create index idx_system_errors_affiliate on system_errors(affiliate_id);

-- Enable RLS
alter table system_errors enable row level security;

-- Only allow service role to insert/update (no user access)
-- Admins will read via server-side queries with service role
