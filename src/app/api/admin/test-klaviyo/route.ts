import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { trackKlaviyoEvent } from "@/lib/klaviyo";

const ADMIN_USER_IDS = process.env.ADMIN_USER_IDS?.split(",") || [];

/**
 * POST /api/admin/test-klaviyo
 *
 * Triggers test events to Klaviyo so you can set up Flows.
 *
 * Body options:
 * - { event: "all" } - Trigger all events
 * - { event: "signup" } - Trigger Affiliate Signed Up
 * - { event: "approved" } - Trigger Affiliate Approved
 * - { event: "referral" } - Trigger Affiliate Referral
 * - { event: "tier_upgrade" } - Trigger Affiliate Tier Upgrade
 * - { event: "payout" } - Trigger Affiliate Payout Sent
 *
 * Optional: { email: "test@example.com" } to use a specific email
 */
export async function POST(request: NextRequest) {
  const { userId } = await auth();

  if (!userId || !ADMIN_USER_IDS.includes(userId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { event = "all", email } = body;

  // Use provided email or default test email
  const testEmail = email || "test@everlore.com";
  const results: Record<string, { success: boolean; error?: string }> = {};

  try {
    // Affiliate Signed Up
    if (event === "all" || event === "signup") {
      try {
        await trackKlaviyoEvent(async (klaviyo) => {
          await klaviyo.trackAffiliateSignedUp({
            email: testEmail,
            first_name: "Test",
            last_name: "Affiliate",
            referral_code: "TESTCODE",
            instagram_handle: "@testaffiliate",
            website_url: "https://example.com",
          });
        });
        results.signup = { success: true };
      } catch (error) {
        results.signup = {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        };
      }
    }

    // Affiliate Approved
    if (event === "all" || event === "approved") {
      try {
        await trackKlaviyoEvent(async (klaviyo) => {
          await klaviyo.trackAffiliateApproved({
            email: testEmail,
            first_name: "Test",
            last_name: "Affiliate",
            referral_code: "TESTCODE",
            tier: "bronze",
            commission_rate: 10,
          });
        });
        results.approved = { success: true };
      } catch (error) {
        results.approved = {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        };
      }
    }

    // Affiliate Referral
    if (event === "all" || event === "referral") {
      try {
        await trackKlaviyoEvent(async (klaviyo) => {
          await klaviyo.trackAffiliateReferral({
            affiliate: {
              email: testEmail,
              first_name: "Test",
              last_name: "Affiliate",
              referral_code: "TESTCODE",
              tier: "bronze",
            },
            referral: {
              id: "test-referral-123",
              order_number: "TEST-1234",
              order_subtotal: 89.99,
              order_total: 99.99,
              commission_amount: 9.99,
              commission_rate: 10,
              is_recurring: false,
              order_source: "shopify",
            },
            customer_email: "customer@example.com",
          });
        });
        results.referral = { success: true };
      } catch (error) {
        results.referral = {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        };
      }
    }

    // Affiliate Tier Upgrade
    if (event === "all" || event === "tier_upgrade") {
      try {
        await trackKlaviyoEvent(async (klaviyo) => {
          await klaviyo.trackAffiliateTierUpgrade({
            email: testEmail,
            first_name: "Test",
            last_name: "Affiliate",
            referral_code: "TESTCODE",
            old_tier: "bronze",
            new_tier: "silver",
            old_commission_rate: 10,
            new_commission_rate: 15,
            total_referrals: 10,
          });
        });
        results.tier_upgrade = { success: true };
      } catch (error) {
        results.tier_upgrade = {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        };
      }
    }

    // Affiliate Payout Sent
    if (event === "all" || event === "payout") {
      try {
        await trackKlaviyoEvent(async (klaviyo) => {
          await klaviyo.trackAffiliatePayoutSent({
            affiliate: {
              email: testEmail,
              first_name: "Test",
              last_name: "Affiliate",
              referral_code: "TESTCODE",
            },
            payout: {
              id: "test-payout-123",
              amount: 50.00,
              method: "paypal",
              paypal_email: testEmail,
            },
          });
        });
        results.payout = { success: true };
      } catch (error) {
        results.payout = {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        };
      }
    }

    const allSuccess = Object.values(results).every(r => r.success);

    return NextResponse.json({
      success: allSuccess,
      message: allSuccess
        ? "All test events sent successfully! Check Klaviyo Analytics → Metrics to see them."
        : "Some events failed to send",
      email_used: testEmail,
      results,
      next_steps: [
        "1. Go to Klaviyo → Analytics → Metrics",
        "2. You should see the test events appear within a few minutes",
        "3. Go to Flows → Create Flow → Create from Scratch",
        "4. Select 'Metric' as trigger and choose an event",
        "5. Design your email template using the event properties",
      ],
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

// GET endpoint to check Klaviyo configuration
export async function GET(request: NextRequest) {
  const { userId } = await auth();

  if (!userId || !ADMIN_USER_IDS.includes(userId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const klaviyoApiKey = process.env.KLAVIYO_API_KEY;

  return NextResponse.json({
    configured: !!klaviyoApiKey,
    api_key_set: !!klaviyoApiKey,
    api_key_preview: klaviyoApiKey
      ? `${klaviyoApiKey.substring(0, 8)}...${klaviyoApiKey.substring(klaviyoApiKey.length - 4)}`
      : null,
    instructions: !klaviyoApiKey ? [
      "1. Go to Klaviyo → Settings → API Keys",
      "2. Create a Private API Key with Events and Profiles write access",
      "3. Add KLAVIYO_API_KEY to your Vercel environment variables",
      "4. Redeploy your application",
    ] : [
      "Klaviyo is configured!",
      "POST to this endpoint to trigger test events",
      "Body: { \"event\": \"all\" } or { \"event\": \"signup\" }",
    ],
  });
}
