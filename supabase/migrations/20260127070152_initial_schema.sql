-- ============================================
-- AFFILIATES
-- ============================================
create table affiliates (
  id uuid primary key default gen_random_uuid(),

  -- Identity
  clerk_user_id text unique,                    -- Links to Clerk auth
  email text unique not null,
  first_name text,
  last_name text,

  -- Status & Tier
  status text default 'pending',                -- pending, approved, rejected, inactive
  tier text default 'initiate',                 -- initiate, adept, inner_circle
  commission_rate decimal(5,4) default 0.10,    -- Current rate (0.10 = 10%)

  -- Tracking
  referral_code text unique not null,           -- e.g., "LUNA15"
  discount_code text,                           -- Shopify discount code (may differ from referral_code)
  shopify_discount_id bigint,                   -- Shopify's internal ID for the discount

  -- Profile
  paypal_email text,                            -- For payouts
  instagram_handle text,
  tiktok_handle text,
  youtube_channel text,
  website_url text,
  bio text,

  -- Stats (denormalized for fast reads)
  total_referrals int default 0,
  total_revenue decimal(12,2) default 0,
  total_commission_earned decimal(12,2) default 0,
  total_commission_paid decimal(12,2) default 0,
  balance_owed decimal(12,2) default 0,

  -- Timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  approved_at timestamptz,
  last_login_at timestamptz
);

-- Indexes
create index idx_affiliates_status on affiliates(status);
create index idx_affiliates_referral_code on affiliates(referral_code);
create index idx_affiliates_discount_code on affiliates(discount_code);
create index idx_affiliates_clerk_user_id on affiliates(clerk_user_id);


-- ============================================
-- REFERRED CUSTOMERS (Lifetime Attribution)
-- ============================================
-- When a customer makes their first purchase with an affiliate code,
-- they are permanently linked to that affiliate.
create table referred_customers (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid references affiliates(id) on delete set null,

  -- Customer identifiers (store all for matching)
  shopify_customer_id bigint unique,
  recharge_customer_id bigint,
  email text not null,

  -- First order info
  first_order_id bigint,
  first_order_date timestamptz,
  first_order_total decimal(12,2),

  -- Timestamps
  created_at timestamptz default now()
);

-- Indexes
create index idx_referred_customers_affiliate on referred_customers(affiliate_id);
create index idx_referred_customers_shopify_id on referred_customers(shopify_customer_id);
create index idx_referred_customers_recharge_id on referred_customers(recharge_customer_id);
create index idx_referred_customers_email on referred_customers(email);


-- ============================================
-- PAYOUTS (created before referrals due to FK)
-- ============================================
create table payouts (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid references affiliates(id) on delete set null,

  -- Payout details
  amount decimal(12,2) not null,
  method text default 'paypal',                 -- paypal, manual, store_credit

  -- PayPal specifics
  paypal_email text,
  paypal_batch_id text,
  paypal_payout_item_id text,

  -- Status
  status text default 'pending',                -- pending, processing, completed, failed
  failure_reason text,

  -- Timestamps
  created_at timestamptz default now(),
  processed_at timestamptz,
  completed_at timestamptz,

  -- Notes
  notes text
);

-- Indexes
create index idx_payouts_affiliate on payouts(affiliate_id);
create index idx_payouts_status on payouts(status);


-- ============================================
-- REFERRALS (Individual Commission Events)
-- ============================================
create table referrals (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid references affiliates(id) on delete set null,
  customer_id uuid references referred_customers(id) on delete set null,

  -- Order details
  order_id text not null,                       -- Shopify order ID or Recharge charge ID
  order_source text not null,                   -- 'shopify' or 'recharge'
  order_number text,                            -- Human-readable order number
  order_date timestamptz not null,

  -- Financials
  order_subtotal decimal(12,2) not null,        -- Before shipping/tax
  order_total decimal(12,2) not null,           -- Full total for reference
  commission_rate decimal(5,4) not null,        -- Rate at time of order
  commission_amount decimal(12,2) not null,     -- Calculated commission

  -- Status
  status text default 'pending',                -- pending, approved, paid, refunded, rejected
  is_recurring boolean default false,           -- true if subscription renewal

  -- Timestamps
  created_at timestamptz default now(),
  approved_at timestamptz,
  paid_at timestamptz,

  -- Payout reference
  payout_id uuid references payouts(id) on delete set null
);

-- Indexes
create index idx_referrals_affiliate on referrals(affiliate_id);
create index idx_referrals_status on referrals(status);
create index idx_referrals_order_id on referrals(order_id);
create index idx_referrals_created_at on referrals(created_at);


-- ============================================
-- TIERS (Configuration Table)
-- ============================================
create table tiers (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,                    -- Display name
  slug text unique not null,                    -- Internal identifier
  min_referrals int not null,                   -- Threshold to reach tier
  commission_rate decimal(5,4) not null,        -- Commission rate for this tier
  description text,
  perks text[],                                 -- Array of perk descriptions
  sort_order int default 0
);

-- Seed default tiers
insert into tiers (name, slug, min_referrals, commission_rate, sort_order, perks) values
  ('Initiate', 'initiate', 0, 0.10, 1, ARRAY['Personal affiliate link & code', 'Access to media gallery']),
  ('Adept', 'adept', 6, 0.15, 2, ARRAY['Everything in Initiate', 'Early episode access', 'Exclusive affiliate lore drops']),
  ('Inner Circle', 'inner_circle', 16, 0.20, 3, ARRAY['Everything in Adept', 'Free subscription', 'Your name in the story', 'Direct line to our team']);


-- ============================================
-- MARKETING ASSETS
-- ============================================
create table marketing_assets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  asset_type text not null,                     -- image, video, document, link
  file_url text not null,
  thumbnail_url text,
  min_tier text default 'initiate',             -- Minimum tier to access
  sort_order int default 0,
  created_at timestamptz default now()
);


-- ============================================
-- ACTIVITY LOG (Audit Trail)
-- ============================================
create table activity_log (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid references affiliates(id) on delete set null,
  action text not null,                         -- signup, approved, referral, tier_upgrade, payout, login
  details jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz default now()
);

-- Index for querying affiliate activity
create index idx_activity_log_affiliate on activity_log(affiliate_id);
create index idx_activity_log_action on activity_log(action);
create index idx_activity_log_created_at on activity_log(created_at);


-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS
alter table affiliates enable row level security;
alter table referred_customers enable row level security;
alter table referrals enable row level security;
alter table payouts enable row level security;
alter table tiers enable row level security;
alter table marketing_assets enable row level security;
alter table activity_log enable row level security;

-- Affiliates can read their own record
create policy "Affiliates can view own profile"
  on affiliates for select
  using (clerk_user_id = auth.jwt()->>'sub');

-- Affiliates can update limited fields on their own record
create policy "Affiliates can update own profile"
  on affiliates for update
  using (clerk_user_id = auth.jwt()->>'sub')
  with check (clerk_user_id = auth.jwt()->>'sub');

-- Affiliates can view their own referrals
create policy "Affiliates can view own referrals"
  on referrals for select
  using (affiliate_id in (
    select id from affiliates where clerk_user_id = auth.jwt()->>'sub'
  ));

-- Affiliates can view their own payouts
create policy "Affiliates can view own payouts"
  on payouts for select
  using (affiliate_id in (
    select id from affiliates where clerk_user_id = auth.jwt()->>'sub'
  ));

-- Everyone can read tiers
create policy "Anyone can view tiers"
  on tiers for select
  using (true);

-- Marketing assets visible based on tier
create policy "Affiliates can view assets for their tier"
  on marketing_assets for select
  using (true); -- Implement tier filtering in application logic


-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to check and upgrade affiliate tier
create or replace function check_tier_upgrade(affiliate_uuid uuid)
returns void as $$
declare
  current_referrals int;
  new_tier record;
  current_tier text;
begin
  -- Get current stats
  select total_referrals, tier into current_referrals, current_tier
  from affiliates where id = affiliate_uuid;

  -- Find appropriate tier
  select * into new_tier
  from tiers
  where min_referrals <= current_referrals
  order by min_referrals desc
  limit 1;

  -- Update if tier changed
  if new_tier.slug != current_tier then
    update affiliates
    set
      tier = new_tier.slug,
      commission_rate = new_tier.commission_rate,
      updated_at = now()
    where id = affiliate_uuid;

    -- Log the upgrade
    insert into activity_log (affiliate_id, action, details)
    values (affiliate_uuid, 'tier_upgrade', jsonb_build_object(
      'old_tier', current_tier,
      'new_tier', new_tier.slug,
      'new_rate', new_tier.commission_rate
    ));
  end if;
end;
$$ language plpgsql security definer;


-- Function to recalculate affiliate stats
create or replace function recalculate_affiliate_stats(affiliate_uuid uuid)
returns void as $$
begin
  update affiliates
  set
    total_referrals = (
      select count(*) from referrals
      where affiliate_id = affiliate_uuid and status in ('approved', 'paid')
    ),
    total_revenue = (
      select coalesce(sum(order_subtotal), 0) from referrals
      where affiliate_id = affiliate_uuid and status in ('approved', 'paid')
    ),
    total_commission_earned = (
      select coalesce(sum(commission_amount), 0) from referrals
      where affiliate_id = affiliate_uuid and status in ('approved', 'paid')
    ),
    total_commission_paid = (
      select coalesce(sum(amount), 0) from payouts
      where affiliate_id = affiliate_uuid and status = 'completed'
    ),
    balance_owed = (
      select coalesce(sum(commission_amount), 0) from referrals
      where affiliate_id = affiliate_uuid and status = 'approved'
    ),
    updated_at = now()
  where id = affiliate_uuid;

  -- Check for tier upgrade
  perform check_tier_upgrade(affiliate_uuid);
end;
$$ language plpgsql security definer;


-- Trigger to auto-update stats when referral status changes
create or replace function trigger_update_affiliate_stats()
returns trigger as $$
begin
  if TG_OP = 'INSERT' or OLD.status != NEW.status then
    perform recalculate_affiliate_stats(NEW.affiliate_id);
  end if;
  return NEW;
end;
$$ language plpgsql;

create trigger referral_status_change
  after insert or update on referrals
  for each row execute function trigger_update_affiliate_stats();
