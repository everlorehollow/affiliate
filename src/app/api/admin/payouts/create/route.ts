import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { createAffiliatePayout, AffiliatePayoutData } from "@/lib/paypal";

const ADMIN_USER_IDS = process.env.ADMIN_USER_IDS?.split(",") || [];

export async function POST(request: NextRequest) {
  const { userId } = await auth();

  if (!userId || !ADMIN_USER_IDS.includes(userId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { affiliateIds, method } = await request.json();

  if (!affiliateIds || !Array.isArray(affiliateIds) || affiliateIds.length === 0) {
    return NextResponse.json({ error: "Missing affiliate IDs" }, { status: 400 });
  }

  const validMethods = ["paypal", "manual", "store_credit"];
  if (!validMethods.includes(method || "manual")) {
    return NextResponse.json({ error: "Invalid method" }, { status: 400 });
  }

  const supabase = createServerClient();

  // Get affiliate data
  const { data: affiliates, error: fetchError } = await supabase
    .from("affiliates")
    .select("id, email, balance_owed, paypal_email, referral_code")
    .in("id", affiliateIds)
    .gte("balance_owed", 25);

  if (fetchError) {
    console.error("Error fetching affiliates:", fetchError);
    return NextResponse.json({ error: "Failed to fetch affiliates" }, { status: 500 });
  }

  if (!affiliates || affiliates.length === 0) {
    return NextResponse.json({ error: "No eligible affiliates found" }, { status: 400 });
  }

  // Generate a batch ID for this payout run
  const batchId = `batch_${Date.now()}`;

  // If PayPal method, validate PayPal emails and process via PayPal
  if (method === "paypal") {
    const missingPayPalEmails = affiliates.filter((a) => !a.paypal_email);
    if (missingPayPalEmails.length > 0) {
      return NextResponse.json({
        error: `Missing PayPal emails for affiliates: ${missingPayPalEmails.map((a) => a.referral_code).join(", ")}`,
      }, { status: 400 });
    }

    // Prepare PayPal payout data
    const paypalData: AffiliatePayoutData[] = affiliates.map((affiliate) => ({
      affiliateId: affiliate.id,
      email: affiliate.email,
      paypalEmail: affiliate.paypal_email,
      amount: affiliate.balance_owed,
      referralCode: affiliate.referral_code,
    }));

    // Create PayPal batch payout
    const paypalResult = await createAffiliatePayout(paypalData, batchId);

    if (!paypalResult.success) {
      console.error("PayPal payout failed:", paypalResult.error);
      return NextResponse.json({
        error: paypalResult.error || "PayPal payout failed",
      }, { status: 500 });
    }

    // Create payout records with PayPal batch ID
    const payouts = affiliates.map((affiliate) => ({
      affiliate_id: affiliate.id,
      amount: affiliate.balance_owed,
      method: "paypal",
      paypal_email: affiliate.paypal_email,
      paypal_batch_id: paypalResult.batchId,
      status: "processing", // PayPal payouts start as processing
    }));

    const { error: insertError } = await supabase.from("payouts").insert(payouts);

    if (insertError) {
      console.error("Error creating payout records:", insertError);
      // Note: PayPal batch was created, but we failed to record it
      return NextResponse.json({
        error: "Payout sent to PayPal but failed to record. PayPal batch ID: " + paypalResult.batchId,
      }, { status: 500 });
    }

    // Log the action
    await supabase.from("activity_log").insert({
      action: "paypal_payouts_created",
      details: {
        created_by: userId,
        affiliate_count: affiliates.length,
        total_amount: affiliates.reduce((sum, a) => sum + a.balance_owed, 0),
        method: "paypal",
        paypal_batch_id: paypalResult.batchId,
      },
    });

    return NextResponse.json({
      success: true,
      count: affiliates.length,
      totalAmount: affiliates.reduce((sum, a) => sum + a.balance_owed, 0),
      paypalBatchId: paypalResult.batchId,
    });
  }

  // Manual payout method - just create pending records
  const payouts = affiliates.map((affiliate) => ({
    affiliate_id: affiliate.id,
    amount: affiliate.balance_owed,
    method: method || "manual",
    paypal_email: affiliate.paypal_email,
    status: "pending",
  }));

  const { error: insertError } = await supabase.from("payouts").insert(payouts);

  if (insertError) {
    console.error("Error creating payouts:", insertError);
    return NextResponse.json({ error: "Failed to create payouts" }, { status: 500 });
  }

  // Log the action
  await supabase.from("activity_log").insert({
    action: "payouts_created",
    details: {
      created_by: userId,
      affiliate_count: affiliates.length,
      total_amount: affiliates.reduce((sum, a) => sum + a.balance_owed, 0),
      method: method || "manual",
    },
  });

  return NextResponse.json({
    success: true,
    count: affiliates.length,
    totalAmount: affiliates.reduce((sum, a) => sum + a.balance_owed, 0),
  });
}
