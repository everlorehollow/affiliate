import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { getPayPalClient, mapPayPalStatus, isPayoutItemSuccess } from "@/lib/paypal";
import { trackKlaviyoEvent } from "@/lib/klaviyo";

const ADMIN_USER_IDS = process.env.ADMIN_USER_IDS?.split(",") || [];

/**
 * POST /api/admin/payouts/check-status
 * Check the status of PayPal payout batches and update our records
 *
 * Can check:
 * - A specific batch: { paypalBatchId: "..." }
 * - All processing batches: {} (no body)
 */
export async function POST(request: NextRequest) {
  const { userId } = await auth();

  if (!userId || !ADMIN_USER_IDS.includes(userId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { paypalBatchId } = body;

  const paypal = getPayPalClient();
  if (!paypal) {
    return NextResponse.json({ error: "PayPal not configured" }, { status: 500 });
  }

  const supabase = createServerClient();

  // Get payouts to check
  let query = supabase
    .from("payouts")
    .select("*, affiliate:affiliates(id, email, first_name, last_name, referral_code, paypal_email)")
    .eq("method", "paypal")
    .in("status", ["pending", "processing"]);

  if (paypalBatchId) {
    query = query.eq("paypal_batch_id", paypalBatchId);
  }

  const { data: payouts, error: fetchError } = await query;

  if (fetchError) {
    console.error("Error fetching payouts:", fetchError);
    return NextResponse.json({ error: "Failed to fetch payouts" }, { status: 500 });
  }

  if (!payouts || payouts.length === 0) {
    return NextResponse.json({ message: "No pending PayPal payouts to check" });
  }

  // Group by batch ID
  const batchIds = [...new Set(payouts.map((p) => p.paypal_batch_id).filter(Boolean))];

  const results: Array<{
    batchId: string;
    status: string;
    updated: number;
    completed: number;
    failed: number;
  }> = [];

  for (const batchId of batchIds) {
    try {
      const batchStatus = await paypal.getPayoutStatus(batchId);
      const internalStatus = mapPayPalStatus(batchStatus.batch_header.batch_status);

      // Get payouts for this batch
      const batchPayouts = payouts.filter((p) => p.paypal_batch_id === batchId);
      let completedCount = 0;
      let failedCount = 0;

      // Check individual item statuses
      for (const payout of batchPayouts) {
        // Find the corresponding PayPal item by sender_item_id (which is our affiliate_id)
        const paypalItem = batchStatus.items?.find(
          (item) => item.payout_item.sender_item_id === payout.affiliate_id
        );

        if (paypalItem) {
          const isSuccess = isPayoutItemSuccess(paypalItem.transaction_status);
          const newStatus = isSuccess ? "completed" :
            ["FAILED", "BLOCKED", "RETURNED", "REFUNDED", "REVERSED"].includes(paypalItem.transaction_status)
              ? "failed" : "processing";

          // Update payout record
          const updateData: Record<string, unknown> = {
            status: newStatus,
            paypal_payout_item_id: paypalItem.payout_item_id,
          };

          if (newStatus === "completed") {
            updateData.completed_at = new Date().toISOString();
            completedCount++;

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
          } else if (newStatus === "failed") {
            updateData.failure_reason = paypalItem.errors?.message || paypalItem.transaction_status;
            failedCount++;
          }

          await supabase
            .from("payouts")
            .update(updateData)
            .eq("id", payout.id);
        }
      }

      results.push({
        batchId,
        status: batchStatus.batch_header.batch_status,
        updated: batchPayouts.length,
        completed: completedCount,
        failed: failedCount,
      });
    } catch (error) {
      console.error(`Error checking batch ${batchId}:`, error);
      results.push({
        batchId,
        status: "ERROR",
        updated: 0,
        completed: 0,
        failed: 0,
      });
    }
  }

  // Log the check
  await supabase.from("activity_log").insert({
    action: "paypal_status_check",
    details: {
      checked_by: userId,
      results,
    },
  });

  return NextResponse.json({
    success: true,
    results,
  });
}
