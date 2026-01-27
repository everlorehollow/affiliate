# Everlore Hollow — Custom Affiliate System Specification

## Project Overview

Build a custom affiliate/referral marketing system for Everlore Hollow, a fantasy subscription box company. The system must track affiliate referrals across both one-time Shopify orders AND recurring Recharge subscription renewals, with lifetime commission attribution.

**Why custom vs. off-the-shelf:**
- UpPromote charges $90/mo + 1.5% commission for required features (tiers, lifetime commission)
- Most apps don't properly handle Recharge subscription renewals
- Need full control over branding and affiliate portal UX
- Owner has technical background and existing Supabase/Clerk experience

---

## Business Requirements

### Core Functionality
1. Affiliates sign up and receive a unique discount code
2. When a customer uses that code, the affiliate gets credit
3. Affiliates earn commission on the initial sale AND all future subscription renewals from that customer (lifetime attribution)
4. Commission rates increase based on performance tiers
5. Affiliates can view their stats, referrals, and earnings in a branded portal
6. Admin can manage affiliates, approve referrals, and process payouts

### Commission Structure
| Tier | Name | Threshold | Commission Rate |
|------|------|-----------|-----------------|
| 1 | Initiate | 0 referrals | 10% |
| 2 | Adept | 6+ referrals | 15% |
| 3 | Inner Circle | 16+ referrals | 20% |

### Business Rules
- Affiliates must be approved before earning commissions
- Commission calculated on order subtotal (excludes shipping/tax)
- 30-day hold period on commissions before eligible for payout (refund protection)
- Minimum payout threshold: $25
- Payouts processed monthly via PayPal
- Customer "belongs" to the affiliate who referred them forever (lifetime attribution)
- Self-referrals are blocked (affiliate can't use their own code)

---

## Technical Stack

### Required Platforms
| Platform | Purpose | Account Status |
|----------|---------|----------------|
| **Supabase** | Database, Edge Functions, Auth (optional) | Owner has experience |
| **Clerk** | Affiliate portal authentication | Owner has experience |
| **Shopify** | E-commerce platform, discount codes, order data | Active store |
| **Recharge** | Subscription management | Active integration |
| **Klaviyo** | Email marketing / transactional emails | Active integration |
| **PayPal** | Affiliate payouts | Needs Payouts API setup |

### Existing Integrations to Preserve
- Shopify ↔ Recharge (subscriptions)
- Shopify ↔ Klaviyo (customer/order data)
- Shopify ↔ Airtable (via n8n)
- Discord community integration

---

## Database Schema (Supabase/Postgres)

```sql
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
  commission_rate decimal(5,4) default 0.15,    -- Current rate (0.15 = 15%)
  
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
-- PAYOUTS
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
  ('Initiate', 'initiate', 0, 0.15, 1, ARRAY['Personal affiliate link & code', 'Access to media gallery']),
  ('Adept', 'adept', 6, 0.20, 2, ARRAY['Everything in Initiate', 'Early episode access', 'Exclusive affiliate lore drops']),
  ('Inner Circle', 'inner_circle', 16, 0.25, 3, ARRAY['Everything in Adept', 'Free subscription', 'Your name in the story', 'Direct line to our team']);


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
```

---

## API Integrations

### 1. Shopify Admin API
**Documentation:** https://shopify.dev/docs/api/admin-rest

**Required Scopes:**
- `read_orders` — To process order webhooks
- `write_discounts` — To create affiliate discount codes
- `read_discounts` — To verify discount codes
- `read_customers` — To get customer details

**Webhooks to Subscribe:**
| Topic | Purpose |
|-------|---------|
| `orders/paid` | Trigger referral attribution |
| `orders/refunded` | Reverse/adjust commission |
| `customers/create` | Optional: early customer capture |

**Key Endpoints:**
```
POST /admin/api/2024-01/price_rules.json          — Create price rule
POST /admin/api/2024-01/price_rules/{id}/discount_codes.json  — Create discount code
GET  /admin/api/2024-01/orders/{id}.json          — Get order details
GET  /admin/api/2024-01/customers/{id}.json       — Get customer details
```

**Discount Code Creation Example:**
```javascript
// First create a price rule
const priceRule = await shopify.priceRule.create({
  title: `Affiliate - ${affiliateCode}`,
  target_type: "line_item",
  target_selection: "all",
  allocation_method: "across",
  value_type: "percentage",
  value: "-10",  // 10% off for customer
  customer_selection: "all",
  usage_limit: null,  // Unlimited uses
  starts_at: new Date().toISOString()
});

// Then create the discount code
const discountCode = await shopify.discountCode.create(priceRule.id, {
  code: affiliateCode  // e.g., "LUNA15"
});
```

---

### 2. Recharge API
**Documentation:** https://developer.rechargepayments.com/

**Authentication:** API key in header `X-Recharge-Access-Token`

**Webhooks to Subscribe:**
| Topic | Purpose |
|-------|---------|
| `charge/created` | Subscription renewal — attribute to affiliate |
| `charge/refunded` | Reverse commission |
| `subscription/created` | Optional: track new subscriptions |
| `customer/created` | Optional: early customer capture |

**Key Endpoints:**
```
GET /customers/{id}           — Get customer details
GET /charges/{id}             — Get charge details  
GET /subscriptions            — List subscriptions
```

**Recharge Charge Webhook Payload (key fields):**
```json
{
  "charge": {
    "id": 123456789,
    "customer_id": 987654321,
    "email": "customer@example.com",
    "total_price": "49.99",
    "subtotal_price": "44.99",
    "shopify_order_id": "5551234567890",
    "status": "SUCCESS",
    "created_at": "2025-01-26T12:00:00",
    "line_items": [...]
  }
}
```

**Critical:** Recharge charges may or may not have a discount code. For recurring charges, you must look up the customer in `referred_customers` table by `recharge_customer_id` or `email` to attribute the sale.

---

### 3. Klaviyo API
**Documentation:** https://developers.klaviyo.com/

**Authentication:** API key in header `Authorization: Klaviyo-API-Key {key}`

**Events to Track:**
| Event Name | Trigger | Data |
|------------|---------|------|
| `Affiliate Signed Up` | New registration | affiliate profile |
| `Affiliate Approved` | Admin approval | affiliate profile |
| `Affiliate Referral` | New sale attributed | referral details |
| `Affiliate Tier Upgrade` | Tier threshold reached | old tier, new tier |
| `Affiliate Payout Sent` | Payout processed | amount, method |

**Key Endpoint:**
```
POST /api/events/
```

**Event Tracking Example:**
```javascript
await klaviyo.events.createEvent({
  data: {
    type: "event",
    attributes: {
      metric: { data: { type: "metric", attributes: { name: "Affiliate Referral" } } },
      profile: { data: { type: "profile", attributes: { email: affiliate.email } } },
      properties: {
        referral_id: referral.id,
        order_total: referral.order_total,
        commission_amount: referral.commission_amount,
        is_recurring: referral.is_recurring,
        customer_email: customer.email
      },
      time: new Date().toISOString()
    }
  }
});
```

---

### 4. PayPal Payouts API
**Documentation:** https://developer.paypal.com/docs/api/payments.payouts-batch/v1/

**Authentication:** OAuth 2.0 (client credentials)

**Key Endpoint:**
```
POST /v1/payments/payouts    — Create batch payout
GET  /v1/payments/payouts/{batch_id}  — Get batch status
```

**Batch Payout Example:**
```javascript
const payout = {
  sender_batch_header: {
    sender_batch_id: `everlore_${Date.now()}`,
    email_subject: "Your Everlore Hollow affiliate payout",
    email_message: "Thank you for being part of the Inner Circle!"
  },
  items: affiliatesToPay.map(a => ({
    recipient_type: "EMAIL",
    amount: { value: a.balance_owed.toFixed(2), currency: "USD" },
    receiver: a.paypal_email,
    note: `Commission payout for ${a.total_referrals} referrals`,
    sender_item_id: a.id
  }))
};

const response = await paypal.payout.create(payout);
```

---

### 5. Clerk API (Authentication)
**Documentation:** https://clerk.com/docs

**Webhook Events:**
| Event | Purpose |
|-------|---------|
| `user.created` | Sync new affiliate to Supabase |
| `session.created` | Track affiliate login |

**Key Points:**
- Use Clerk's `userId` as `clerk_user_id` in affiliates table
- Clerk handles password reset, email verification, etc.
- Use Clerk's `<SignIn>` and `<SignUp>` components in portal

---

## Webhook Handlers (Edge Functions)

### 1. Shopify Order Webhook Handler

**Endpoint:** `POST /functions/v1/webhook-shopify-order`

**Logic:**
```
1. Verify webhook signature (HMAC)
2. Parse order payload
3. Check if order has discount code
4. Look up discount code in affiliates table
5. If found:
   a. Check for self-referral (affiliate email != customer email)
   b. Create or get referred_customer record
   c. Calculate commission (order_subtotal * affiliate.commission_rate)
   d. Insert referral record (status: 'pending')
   e. Update affiliate stats
   f. Trigger Klaviyo "Affiliate Referral" event
6. Return 200 OK
```

### 2. Recharge Charge Webhook Handler

**Endpoint:** `POST /functions/v1/webhook-recharge-charge`

**Logic:**
```
1. Verify webhook signature
2. Parse charge payload
3. Look up customer in referred_customers by:
   - recharge_customer_id, OR
   - shopify_customer_id (from charge.shopify_order_id), OR
   - email
4. If found (customer belongs to an affiliate):
   a. Get affiliate details
   b. Calculate commission
   c. Insert referral record (status: 'pending', is_recurring: true)
   d. Update affiliate stats
   e. Trigger Klaviyo event
5. If not found: ignore (not a referred customer)
6. Return 200 OK
```

### 3. Affiliate Signup Handler

**Endpoint:** `POST /functions/v1/affiliate-signup`

**Logic:**
```
1. Validate input (email, name, etc.)
2. Check if email already exists
3. Generate unique referral code
4. Create Shopify discount code via API
5. Insert affiliate record (status: 'pending')
6. Trigger Klaviyo "Affiliate Signed Up" event
7. Return success with affiliate details
```

### 4. Refund Handler

**Endpoint:** `POST /functions/v1/webhook-shopify-refund`

**Logic:**
```
1. Find original referral by order_id
2. If found and status != 'paid':
   a. Update status to 'refunded'
   b. Recalculate affiliate stats
3. If already paid:
   a. Flag for manual review OR
   b. Create negative adjustment
```

---

## Affiliate Portal (Frontend)

### Tech Stack
- **Framework:** Next.js 14+ (App Router)
- **Auth:** Clerk
- **Styling:** Tailwind CSS (match Everlore dark fantasy aesthetic)
- **Data Fetching:** Supabase client

### Pages

| Route | Purpose | Auth Required |
|-------|---------|---------------|
| `/` | Landing / marketing page | No |
| `/apply` | Registration form | No |
| `/sign-in` | Clerk sign in | No |
| `/dashboard` | Stats overview | Yes |
| `/referrals` | Referral history table | Yes |
| `/payouts` | Payout history | Yes |
| `/assets` | Marketing materials | Yes |
| `/settings` | Profile, PayPal email | Yes |

### Dashboard Components

**Stats Cards:**
- Total Referrals
- Total Revenue Generated
- Total Earnings
- Balance Available
- Current Tier + Progress to Next

**Referral Link/Code Display:**
- Copyable referral link
- Copyable discount code
- Share buttons (optional)

**Recent Activity:**
- Last 5 referrals
- Last payout

### Design Requirements
- Dark purple background (#2c0046)
- Gold accents (#d4af37)
- Cinzel font for headings
- Cormorant Garamond for body
- Mobile responsive
- Match existing Everlore Hollow branding

---

## Admin Panel

Can use Supabase Studio for MVP, or build simple admin:

### Required Admin Functions
1. **View all affiliates** — Filter by status, tier, search
2. **Approve/reject affiliates** — With email trigger
3. **View all referrals** — Filter by status, affiliate, date
4. **Approve/reject referrals** — Bulk actions
5. **Generate payout batch** — Select affiliates, create PayPal batch
6. **Mark payouts complete** — After PayPal confirms
7. **Manually adjust commission** — For disputes/corrections
8. **Edit affiliate tier** — Manual override

---

## Email Flows (Klaviyo)

### Transactional Emails

| Trigger | Email | Content |
|---------|-------|---------|
| Affiliate signs up | Welcome (Pending) | Thanks for applying, we'll review shortly |
| Affiliate approved | Welcome (Approved) | You're in! Here's your code and link |
| Affiliate rejected | Rejection | Sorry, not a fit right now |
| New referral | Sale Notification | Someone used your code! +$X commission |
| Tier upgrade | Tier Upgrade | Congrats! You're now [Tier] with X% commission |
| Payout sent | Payout Confirmation | $X sent to your PayPal |
| Monthly summary | Monthly Digest | Your stats this month |

### Suggested Flows
1. **Affiliate Onboarding** — Multi-email series teaching them how to promote
2. **Dormant Affiliate Win-back** — No sales in 60 days
3. **Tier Progress Nudge** — "You're 2 referrals away from Adept!"

---

## Fraud Prevention

### Signup Fraud
- [ ] IP rate limiting (max 3 signups per IP per day)
- [ ] Email domain blocking (temp email services)
- [ ] Manual approval requirement
- [ ] CAPTCHA on signup form

### Referral Fraud
- [ ] Self-referral blocking (affiliate email ≠ customer email)
- [ ] Same household detection (same IP on signup and order)
- [ ] Velocity checks (too many orders too fast)
- [ ] 30-day hold period before commission is payable
- [ ] Refund clawback

### Manual Monitoring
- Weekly review of top affiliates
- Flag orders from same IP as affiliate
- Monitor for suspicious patterns

---

## Reference: How Existing Apps Do It

### UpPromote API
**Docs:** https://aff-api.uppromote.com/docs/v2/api-overview-1615961m0

Useful endpoints to study:
- `POST /api/v2/affiliate` — Create affiliate
- `POST /api/v2/referral` — Create referral manually
- `GET /api/v2/affiliates` — List with filters
- Webhook payloads for events

### ReferralCandy
**Integration approach:** 
- Uses post-purchase JavaScript snippet
- Tracks via cookies + discount codes
- Klaviyo integration via events API

### Refersion
**Docs:** https://www.refersion.com/developers/

Useful patterns:
- First-party cookie tracking
- Conversion pixel approach
- Affiliate marketplace model

### Social Snowball
**Key innovation:** 
- Post-purchase popup instantly makes customer an affiliate
- "Safelinks" for coupon leak prevention (advanced)

---

## Development Phases

### Phase 1: Foundation (Week 1)
- [ ] Supabase project + schema
- [ ] Clerk application
- [ ] Shopify private app + webhook subscriptions
- [ ] Recharge webhook subscriptions
- [ ] Basic Edge Functions (order webhook, signup)

### Phase 2: Core Backend (Week 1-2)
- [ ] Shopify order attribution
- [ ] Recharge renewal attribution
- [ ] Tier upgrade logic
- [ ] Klaviyo event integration
- [ ] Refund handling

### Phase 3: Affiliate Portal (Week 2-3)
- [ ] Next.js project setup
- [ ] Clerk integration
- [ ] Dashboard page
- [ ] Referrals page
- [ ] Settings page
- [ ] Assets page
- [ ] Mobile responsive

### Phase 4: Admin + Payouts (Week 3-4)
- [ ] Admin affiliate management
- [ ] Admin referral management
- [ ] PayPal Payouts integration
- [ ] Payout batch generation
- [ ] Payout tracking

### Phase 5: Polish (Week 4)
- [ ] Email templates in Klaviyo
- [ ] Fraud prevention rules
- [ ] Testing with real transactions
- [ ] Documentation
- [ ] Monitoring/alerting setup

---

## Testing Checklist

### Affiliate Signup
- [ ] Form validation works
- [ ] Shopify discount code created
- [ ] Affiliate record in database
- [ ] Klaviyo event fires
- [ ] Duplicate email rejected

### Order Attribution
- [ ] Order with affiliate code → referral created
- [ ] Commission calculated correctly
- [ ] Affiliate stats updated
- [ ] Tier upgrade triggers at threshold
- [ ] Self-referral blocked

### Subscription Renewals
- [ ] Recharge charge webhook received
- [ ] Customer matched to affiliate
- [ ] Recurring referral created
- [ ] is_recurring = true

### Refunds
- [ ] Refund webhook received
- [ ] Referral status updated
- [ ] Affiliate stats recalculated

### Payouts
- [ ] Batch generation works
- [ ] PayPal API accepts batch
- [ ] Payout records created
- [ ] Affiliate balance updated

### Portal
- [ ] Login works
- [ ] Stats display correctly
- [ ] Referral history accurate
- [ ] Payout history accurate
- [ ] Code/link copy works

---



---


1. **Discount amount:** Customers get 10% discount with affiliate code 
2. **Referral code format:** Auto-generated vs. affiliate chooses?
3. **Approval flow:** All affiliates need manual approval, or auto-approve with conditions?
4. **Asset hosting:** Where will marketing materials be stored? (Supabase storage?)
5. **Subdomain:** Affiliate portal at `affiliates.everlorehollow.com` or `/affiliates` path?
6. **Existing affiliates:** Any to migrate from previous system?

---

## Contacts & Resources

- **Shopify Store:** everlorehollow.com
- **Owner:** Travis (technical, familiar with Supabase/Clerk)
- **Existing Stack:** Shopify, Recharge, Klaviyo, Airtable, n8n, Discord

---

*Document Version: 1.0*
*Last Updated: January 2025*
