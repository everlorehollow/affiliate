import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createServerClient } from "@/lib/supabase";
import { isPayoutItemSuccess } from "@/lib/paypal";
import { trackKlaviyoEvent } from "@/lib/klaviyo";

/**
 * PayPal Webhook Handler
 * Documentation: https://developer.paypal.com/docs/api-basics/notifications/webhooks/
 *
 * Handles payout status updates from PayPal.
 * Event types:
 * - PAYMENT.PAYOUTSBATCH.PROCESSING
 * - PAYMENT.PAYOUTSBATCH.SUCCESS
 * - PAYMENT.PAYOUTSBATCH.DENIED
 * - PAYMENT.PAYOUTS-ITEM.SUCCEEDED
 * - PAYMENT.PAYOUTS-ITEM.FAILED
 * - PAYMENT.PAYOUTS-ITEM.UNCLAIMED
 */

// Verify PayPal webhook signature
// Note: For production, you should implement proper signature verification
// using PayPal's webhook verification API
async function verifyPayPalWebhook(
  headers: Headers,
  body: string
): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    console.warn("PayPal webhook ID not configured - skipping verification");
    return true; // Allow in dev, but log warning
  }

  // PayPal sends these headers for verification
  const transmissionId = headers.get("paypal-transmission-id");
  const timestamp = headers.get("paypal-transmission-time");
  const certUrl = headers.get("paypal-cert-url");
  const authAlgo = headers.get("paypal-auth-algo");
  const transmissionSig = headers.get("paypal-transmission-sig");

  if (!transmissionId || !timestamp || !certUrl || !transmissionSig) {
    console.error("Missing PayPal webhook headers");
    return false;
  }

  // For full production verification, you would:
  // 1. Fetch the cert from certUrl
  // 2. Build the expected signature string
  // 3. Verify using the cert and algo
  // For now, we'll do a basic check and recommend using PayPal's verification API

  // Simple validation: check if required headers are present and cert URL is from PayPal
  if (!certUrl.startsWith("https://api.paypal.com/") &&
      !certUrl.startsWith("https://api.sandbox.paypal.com/")) {
    console.error("Invalid PayPal cert URL:", certUrl);
    return false;
  }

  return true;
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headers = request.headers;

  // Verify webhook (basic check)
  const isValid = await verifyPayPalWebhook(headers, body);
  if (!isValid) {
    return NextResponse.json({ error: "Invalid webhook" }, { status: 401 });
  }

  const event = JSON.parse(body);
  const supabase = createServerClient();

  // Log the webhook
  await supabase.from("activity_log").insert({
    action: "paypal_webhook_received",
    details: {
      event_type: event.event_type,
      event_id: event.id,
      resource_type: event.resource_type,
      timestamp: new Date().toISOString(),
    },
  });

  try {
    switch (event.event_type) {
      case "PAYMENT.PAYOUTSBATCH.SUCCESS":
        await handleBatchSuccess(event.resource, supabase);
        break;
      case "PAYMENT.PAYOUTSBATCH.DENIED":
        await handleBatchDenied(event.resource, supabase);
        break;
      case "PAYMENT.PAYOUTS-ITEM.SUCCEEDED":
        await handleItemSucceeded(event.resource, supabase);
        break;
      case "PAYMENT.PAYOUTS-ITEM.FAILED":
      case "PAYMENT.PAYOUTS-ITEM.BLOCKED":
      case "PAYMENT.PAYOUTS-ITEM.RETURNED":
      case "PAYMENT.PAYOUTS-ITEM.REFUNDED":
        await handleItemFailed(event.resource, supabase);
        break;
      case "PAYMENT.PAYOUTS-ITEM.UNCLAIMED":
        await handleItemUnclaimed(event.resource, supabase);
        break;
      default:
        console.log("Unhandled PayPal event type:", event.event_type);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PayPal webhook processing error:", error);
    await supabase.from("activity_log").insert({
      action: "paypal_webhook_error",
      details: {
        event_type: event.event_type,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
    });
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}

async function handleBatchSuccess(resource: any, supabase: any) {
  const batchId = resource.batch_header?.payout_batch_id;
  if (!batchId) return;

  // Update all payouts in this batch to completed
  const { data: payouts } = await supabase
    .from("payouts")
    .select("*, affiliate:affiliates(id, email, first_name, last_name, referral_code, paypal_email)")
    .eq("paypal_batch_id", batchId)
    .eq("status", "processing");

  if (!payouts) return;

  for (const payout of payouts) {
    await supabase
      .from("payouts")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", payout.id);

    // Mark referrals as paid
    await supabase
      .from("referrals")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        payout_id: payout.id,
      })
      .eq("affiliate_id", payout.affiliate_id)
      .eq("status", "approved");

    // Recalculate affiliate stats
    await supabase.rpc("recalculate_affiliate_stats", {
      affiliate_uuid: payout.affiliate_id,
    });

    // Track in Klaviyo
    if (payout.affiliate) {
      await trackKlaviyoEvent(async (klaviyo) => {
        await klaviyo.trackAffiliatePayoutSent({
          affiliate: {
            email: payout.affiliate.email,
            first_name: payout.affiliate.first_name,
            last_name: payout.affiliate.last_name,
            referral_code: payout.affiliate.referral_code,
          },
          payout: {
            id: payout.id,
            amount: payout.amount,
            method: "paypal",
            paypal_email: payout.affiliate.paypal_email,
          },
        });
      });
    }
  }
}

async function handleBatchDenied(resource: any, supabase: any) {
  const batchId = resource.batch_header?.payout_batch_id;
  if (!batchId) return;

  // Mark all payouts in this batch as failed
  await supabase
    .from("payouts")
    .update({
      status: "failed",
      failure_reason: "Batch denied by PayPal",
    })
    .eq("paypal_batch_id", batchId)
    .eq("status", "processing");
}

async function handleItemSucceeded(resource: any, supabase: any) {
  const affiliateId = resource.payout_item?.sender_item_id;
  const batchId = resource.payout_batch_id;
  if (!affiliateId || !batchId) return;

  // Find and update the specific payout
  const { data: payout } = await supabase
    .from("payouts")
    .select("*, affiliate:affiliates(id, email, first_name, last_name, referral_code, paypal_email)")
    .eq("paypal_batch_id", batchId)
    .eq("affiliate_id", affiliateId)
    .single();

  if (!payout) return;

  await supabase
    .from("payouts")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      paypal_payout_item_id: resource.payout_item_id,
    })
    .eq("id", payout.id);

  // Mark referrals as paid
  await supabase
    .from("referrals")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      payout_id: payout.id,
    })
    .eq("affiliate_id", affiliateId)
    .eq("status", "approved");

  // Recalculate affiliate stats
  await supabase.rpc("recalculate_affiliate_stats", {
    affiliate_uuid: affiliateId,
  });

  // Track in Klaviyo
  if (payout.affiliate) {
    await trackKlaviyoEvent(async (klaviyo) => {
      await klaviyo.trackAffiliatePayoutSent({
        affiliate: {
          email: payout.affiliate.email,
          first_name: payout.affiliate.first_name,
          last_name: payout.affiliate.last_name,
          referral_code: payout.affiliate.referral_code,
        },
        payout: {
          id: payout.id,
          amount: payout.amount,
          method: "paypal",
          paypal_email: payout.affiliate.paypal_email,
        },
      });
    });
  }
}

async function handleItemFailed(resource: any, supabase: any) {
  const affiliateId = resource.payout_item?.sender_item_id;
  const batchId = resource.payout_batch_id;
  if (!affiliateId || !batchId) return;

  await supabase
    .from("payouts")
    .update({
      status: "failed",
      failure_reason: resource.errors?.message || resource.transaction_status || "Payment failed",
      paypal_payout_item_id: resource.payout_item_id,
    })
    .eq("paypal_batch_id", batchId)
    .eq("affiliate_id", affiliateId);
}

async function handleItemUnclaimed(resource: any, supabase: any) {
  const affiliateId = resource.payout_item?.sender_item_id;
  const batchId = resource.payout_batch_id;
  if (!affiliateId || !batchId) return;

  // Mark as processing still, but note it's unclaimed
  // PayPal will try again or eventually return it
  await supabase
    .from("payouts")
    .update({
      notes: "Payment unclaimed by recipient - PayPal will retry",
      paypal_payout_item_id: resource.payout_item_id,
    })
    .eq("paypal_batch_id", batchId)
    .eq("affiliate_id", affiliateId);
}
