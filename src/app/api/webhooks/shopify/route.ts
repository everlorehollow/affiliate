import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createServerClient } from "@/lib/supabase";
import { trackKlaviyoEvent } from "@/lib/klaviyo";
import { logWebhookActivity, extractClientIp, extractUserAgent } from "@/lib/activity-log";
import { checkReferralFraud } from "@/lib/fraud-detection";

// Verify Shopify webhook signature
function verifyShopifyWebhook(
  body: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature || !secret) return false;

  const hmac = crypto
    .createHmac("sha256", secret)
    .update(body, "utf8")
    .digest("base64");

  return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signature));
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("x-shopify-hmac-sha256");
  const topic = request.headers.get("x-shopify-topic");

  const supabase = createServerClient();
  const clientIp = extractClientIp(request);
  const userAgent = extractUserAgent(request);

  // Log all incoming webhooks for debugging
  await supabase.from("activity_log").insert({
    action: "shopify_webhook_received",
    details: {
      topic,
      has_signature: !!signature,
      body_preview: body.substring(0, 500),
      timestamp: new Date().toISOString(),
    },
    ip_address: clientIp,
    user_agent: userAgent,
  });

  // Verify webhook signature
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (secret && !verifyShopifyWebhook(body, signature, secret)) {
    await logWebhookActivity(request, "shopify", "invalid_signature", false, {
      topic,
      signature,
    });
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const order = JSON.parse(body);

  try {
    // Handle different webhook topics
    if (topic === "orders/paid" || topic === "orders/create") {
      await handleOrderPaid(order, supabase, request);
    } else if (topic === "refunds/create") {
      await handleRefund(order, supabase, request);
    }

    await logWebhookActivity(request, "shopify", topic || "unknown", true, {
      order_id: order?.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    await logWebhookActivity(request, "shopify", topic || "unknown", false, {
      order_id: order?.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Processing failed" },
      { status: 500 }
    );
  }
}

async function handleOrderPaid(order: any, supabase: any, request: NextRequest) {
  // Check if order has a discount code
  const discountCodes = order.discount_codes || [];
  if (discountCodes.length === 0) {
    console.log("No discount code on order", order.id);
    return;
  }

  // Find matching affiliate by discount code
  const discountCode = discountCodes[0].code.toUpperCase();

  const { data: affiliate, error: affiliateError } = await supabase
    .from("affiliates")
    .select("*")
    .or(`referral_code.ilike.${discountCode},discount_code.ilike.${discountCode}`)
    .eq("status", "approved")
    .single();

  if (affiliateError || !affiliate) {
    console.log("No affiliate found for discount code:", discountCode);
    return;
  }

  // Check for self-referral (affiliate can't use their own code)
  const customerEmail = order.customer?.email?.toLowerCase();
  if (customerEmail === affiliate.email.toLowerCase()) {
    console.log("Self-referral blocked for:", customerEmail);
    await logWebhookActivity(request, "shopify", "self_referral_blocked", false, {
      affiliate_id: affiliate.id,
      customer_email: customerEmail,
      order_id: order.id,
    });
    return;
  }

  // Check if this order was already processed
  const { data: existingReferral } = await supabase
    .from("referrals")
    .select("id")
    .eq("order_id", order.id.toString())
    .single();

  if (existingReferral) {
    console.log("Order already processed:", order.id);
    return;
  }

  // Calculate order totals for fraud check
  const orderSubtotal = parseFloat(order.subtotal_price || order.total_line_items_price || order.total_price);
  const orderTotal = parseFloat(order.total_price);

  // Fraud detection check
  const fraudCheck = await checkReferralFraud(
    request,
    affiliate.id,
    customerEmail || "",
    orderTotal,
    discountCode
  );

  // Determine initial status based on fraud check
  // If flagged, set to pending for manual review; otherwise still pending for normal flow
  const initialStatus = "pending";
  const fraudFlagged = fraudCheck.flagged;

  // Create or get referred customer record
  const { data: customer } = await supabase
    .from("referred_customers")
    .upsert(
      {
        shopify_customer_id: order.customer?.id,
        email: customerEmail,
        affiliate_id: affiliate.id,
        first_order_id: order.id,
        first_order_date: order.created_at,
        first_order_total: orderTotal,
      },
      {
        onConflict: "shopify_customer_id",
        ignoreDuplicates: true,
      }
    )
    .select()
    .single();

  // Calculate commission
  const commissionRate = affiliate.commission_rate;
  const commissionAmount = orderSubtotal * commissionRate;

  // Create referral record
  const { error: referralError } = await supabase.from("referrals").insert({
    affiliate_id: affiliate.id,
    customer_id: customer?.id,
    order_id: order.id.toString(),
    order_source: "shopify",
    order_number: order.name || order.order_number?.toString(),
    order_date: order.created_at,
    order_subtotal: orderSubtotal,
    order_total: orderTotal,
    commission_rate: commissionRate,
    commission_amount: commissionAmount,
    status: initialStatus,
    is_recurring: false,
  });

  if (referralError) {
    console.error("Failed to create referral:", referralError);
    throw referralError;
  }

  // Log fraud flag if detected (for admin review)
  if (fraudFlagged) {
    await supabase.from("activity_log").insert({
      affiliate_id: affiliate.id,
      action: "referral_fraud_flagged",
      details: {
        order_id: order.id,
        fraud_score: fraudCheck.score,
        fraud_reasons: fraudCheck.reasons,
        discount_code: discountCode,
        customer_email: customerEmail,
        order_total: orderTotal,
        timestamp: new Date().toISOString(),
      },
      ip_address: extractClientIp(request),
      user_agent: extractUserAgent(request),
    });
    console.log(`Referral flagged for review: Order ${order.id}, Score: ${fraudCheck.score}, Reasons: ${fraudCheck.reasons.join(", ")}`);
  }

  // Track referral event in Klaviyo
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
        id: order.id.toString(),
        order_number: order.name || order.order_number?.toString(),
        order_subtotal: orderSubtotal,
        order_total: orderTotal,
        commission_amount: commissionAmount,
        commission_rate: commissionRate,
        is_recurring: false,
        order_source: "shopify",
      },
      customer_email: customerEmail,
    });
  });

  console.log(
    `Referral created: Order ${order.name}, Affiliate ${affiliate.referral_code}, Commission $${commissionAmount.toFixed(2)}${fraudFlagged ? " [FLAGGED]" : ""}`
  );
}

async function handleRefund(refund: any, supabase: any, request: NextRequest) {
  const orderId = refund.order_id?.toString();
  if (!orderId) return;

  // Find the referral for this order
  const { data: referral, error } = await supabase
    .from("referrals")
    .select("*")
    .eq("order_id", orderId)
    .single();

  if (error || !referral) {
    console.log("No referral found for refunded order:", orderId);
    return;
  }

  // Only update if not already paid out
  if (referral.status === "paid") {
    console.log("Referral already paid, flagging for manual review:", orderId);
    await supabase.from("activity_log").insert({
      affiliate_id: referral.affiliate_id,
      action: "refund_on_paid_referral",
      details: {
        referral_id: referral.id,
        order_id: orderId,
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

  await logWebhookActivity(request, "shopify", "refund_processed", true, {
    referral_id: referral.id,
    order_id: orderId,
    commission_amount: referral.commission_amount,
  });

  console.log("Referral marked as refunded:", orderId);
}
