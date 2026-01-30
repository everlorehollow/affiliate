import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createServerClient } from "@/lib/supabase";
import { trackKlaviyoEvent } from "@/lib/klaviyo";
import { logWebhookActivity, extractClientIp, extractUserAgent } from "@/lib/activity-log";
import { checkReferralFraud } from "@/lib/fraud-detection";
import { logWebhookError } from "@/lib/error-log";

// Verify Recharge webhook signature
function verifyRechargeWebhook(
  body: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature || !secret) return false;

  const hmac = crypto
    .createHmac("sha256", secret)
    .update(body, "utf8")
    .digest("hex");

  return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signature));
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("x-recharge-hmac-sha256");

  // Verify webhook signature
  const secret = process.env.RECHARGE_WEBHOOK_SECRET;
  if (secret && !verifyRechargeWebhook(body, signature, secret)) {
    console.error("Invalid Recharge webhook signature");
    await logWebhookActivity(request, "recharge", "invalid_signature", false, {
      signature,
    });
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(body);
  const supabase = createServerClient();

  try {
    // Recharge sends charge data in the payload
    const charge = payload.charge || payload;

    if (charge.status === "SUCCESS" || charge.status === "PAID") {
      await handleChargeSuccess(charge, supabase, request);
    } else if (charge.status === "REFUNDED") {
      await handleChargeRefund(charge, supabase, request);
    }

    await logWebhookActivity(request, "recharge", charge.status || "unknown", true, {
      charge_id: charge?.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Recharge webhook processing error:", error);

    // Log to activity log
    await logWebhookActivity(request, "recharge", "processing_error", false, {
      error: error instanceof Error ? error.message : String(error),
    });

    // Log to error monitor
    const charge = payload.charge || payload;
    await logWebhookError(request, "recharge_webhook", error instanceof Error ? error : String(error), {
      endpoint: "/api/webhooks/recharge",
      order_id: charge?.id?.toString(),
      request_payload: {
        charge_id: charge?.id,
        status: charge?.status,
        customer_id: charge?.customer_id,
      },
      http_status: 500,
      details: {
        customer_email: charge?.email,
        shopify_customer_id: charge?.shopify_customer_id,
      },
    });

    return NextResponse.json(
      { error: "Processing failed" },
      { status: 500 }
    );
  }
}

async function handleChargeSuccess(charge: any, supabase: any, request: NextRequest) {
  const chargeId = charge.id?.toString();
  const customerEmail = charge.email?.toLowerCase();
  const rechargeCustomerId = charge.customer_id;
  const shopifyCustomerId = charge.shopify_customer_id;

  // Check if this charge was already processed
  const { data: existingReferral } = await supabase
    .from("referrals")
    .select("id")
    .eq("order_id", chargeId)
    .single();

  if (existingReferral) {
    console.log("Charge already processed:", chargeId);
    return;
  }

  // Look up the customer in referred_customers
  // Try multiple identifiers for matching
  let customer = null;

  // Try Recharge customer ID first
  if (rechargeCustomerId) {
    const { data } = await supabase
      .from("referred_customers")
      .select("*, affiliate:affiliates(*)")
      .eq("recharge_customer_id", rechargeCustomerId)
      .single();
    customer = data;
  }

  // Try Shopify customer ID
  if (!customer && shopifyCustomerId) {
    const { data } = await supabase
      .from("referred_customers")
      .select("*, affiliate:affiliates(*)")
      .eq("shopify_customer_id", shopifyCustomerId)
      .single();
    customer = data;

    // Update with Recharge customer ID for future lookups
    if (customer && rechargeCustomerId) {
      await supabase
        .from("referred_customers")
        .update({ recharge_customer_id: rechargeCustomerId })
        .eq("id", customer.id);
    }
  }

  // Try email as fallback
  if (!customer && customerEmail) {
    const { data } = await supabase
      .from("referred_customers")
      .select("*, affiliate:affiliates(*)")
      .eq("email", customerEmail)
      .single();
    customer = data;
  }

  // If no referred customer found, this isn't an affiliate referral
  if (!customer || !customer.affiliate) {
    console.log("No referred customer found for charge:", chargeId);
    return;
  }

  const affiliate = customer.affiliate;

  // Only process if affiliate is still approved
  if (affiliate.status !== "approved") {
    console.log("Affiliate not approved, skipping:", affiliate.id);
    return;
  }

  // Calculate commission
  const orderSubtotal = parseFloat(charge.subtotal_price || charge.total_price);
  const orderTotal = parseFloat(charge.total_price);
  const commissionRate = affiliate.commission_rate;
  const commissionAmount = orderSubtotal * commissionRate;

  // Fraud detection check for recurring charges
  const fraudCheck = await checkReferralFraud(
    request,
    affiliate.id,
    customerEmail || "",
    orderTotal,
    affiliate.discount_code || ""
  );

  const fraudFlagged = fraudCheck.flagged;

  // Create referral record (recurring)
  const { error: referralError } = await supabase.from("referrals").insert({
    affiliate_id: affiliate.id,
    customer_id: customer.id,
    order_id: chargeId,
    order_source: "recharge",
    order_number: charge.shopify_order_id?.toString() || chargeId,
    order_date: charge.created_at || new Date().toISOString(),
    order_subtotal: orderSubtotal,
    order_total: orderTotal,
    commission_rate: commissionRate,
    commission_amount: commissionAmount,
    status: "pending",
    is_recurring: true,
  });

  if (referralError) {
    console.error("Failed to create recurring referral:", referralError);
    throw referralError;
  }

  // Log fraud flag if detected
  if (fraudFlagged) {
    await supabase.from("activity_log").insert({
      affiliate_id: affiliate.id,
      action: "recurring_referral_fraud_flagged",
      details: {
        charge_id: chargeId,
        fraud_score: fraudCheck.score,
        fraud_reasons: fraudCheck.reasons,
        customer_email: customerEmail,
        order_total: orderTotal,
        timestamp: new Date().toISOString(),
      },
      ip_address: extractClientIp(request),
      user_agent: extractUserAgent(request),
    });
    console.log(`Recurring referral flagged for review: Charge ${chargeId}, Score: ${fraudCheck.score}`);
  }

  // Track recurring referral event in Klaviyo
  await trackKlaviyoEvent(async (klaviyo) => {
    await klaviyo.trackAffiliateReferral({
      affiliate: {
        email: affiliate.email,
        first_name: affiliate.first_name,
        last_name: affiliate.last_name,
        referral_code: affiliate.referral_code,
        tier: affiliate.tier,
      },
      referral: {
        id: chargeId,
        order_number: charge.shopify_order_id?.toString() || chargeId,
        order_subtotal: orderSubtotal,
        order_total: orderTotal,
        commission_amount: commissionAmount,
        commission_rate: commissionRate,
        is_recurring: true,
        order_source: "recharge",
      },
      customer_email: customerEmail,
    });
  });

  // Check if the referral insert triggered a tier upgrade (via DB trigger)
  const { data: updatedAffiliate } = await supabase
    .from("affiliates")
    .select("tier, commission_rate, total_referrals")
    .eq("id", affiliate.id)
    .single();

  if (updatedAffiliate && updatedAffiliate.tier !== affiliate.tier) {
    await trackKlaviyoEvent(async (klaviyo) => {
      await klaviyo.trackAffiliateTierUpgrade({
        email: affiliate.email,
        first_name: affiliate.first_name,
        last_name: affiliate.last_name,
        referral_code: affiliate.referral_code,
        old_tier: affiliate.tier,
        new_tier: updatedAffiliate.tier,
        old_commission_rate: affiliate.commission_rate,
        new_commission_rate: updatedAffiliate.commission_rate,
        total_referrals: updatedAffiliate.total_referrals,
      });
    });
    console.log(`Tier upgrade: ${affiliate.referral_code} ${affiliate.tier} -> ${updatedAffiliate.tier}`);
  }

  console.log(
    `Recurring referral created: Charge ${chargeId}, Affiliate ${affiliate.referral_code}, Commission $${commissionAmount.toFixed(2)}${fraudFlagged ? " [FLAGGED]" : ""}`
  );
}

async function handleChargeRefund(charge: any, supabase: any, request: NextRequest) {
  const chargeId = charge.id?.toString();
  if (!chargeId) return;

  // Find the referral for this charge
  const { data: referral, error } = await supabase
    .from("referrals")
    .select("*")
    .eq("order_id", chargeId)
    .single();

  if (error || !referral) {
    console.log("No referral found for refunded charge:", chargeId);
    return;
  }

  // Only update if not already paid out
  if (referral.status === "paid") {
    console.log("Referral already paid, flagging for manual review:", chargeId);
    await supabase.from("activity_log").insert({
      affiliate_id: referral.affiliate_id,
      action: "refund_on_paid_recurring_referral",
      details: {
        referral_id: referral.id,
        charge_id: chargeId,
        commission_amount: referral.commission_amount,
        timestamp: new Date().toISOString(),
      },
      ip_address: extractClientIp(request),
      user_agent: extractUserAgent(request),
    });
    return;
  }

  // Update referral status to refunded
  await supabase
    .from("referrals")
    .update({ status: "refunded" })
    .eq("id", referral.id);

  await logWebhookActivity(request, "recharge", "refund_processed", true, {
    referral_id: referral.id,
    charge_id: chargeId,
    commission_amount: referral.commission_amount,
  });

  console.log("Recurring referral marked as refunded:", chargeId);
}
