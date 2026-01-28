import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { checkPayoutBatchStatus } from "@/lib/paypal";
import { trackKlaviyoEvent } from "@/lib/klaviyo";
import { logSystemError } from "@/lib/error-log";

// PayPal Status Polling Endpoint
//
// This endpoint checks the status of all "processing" payouts and updates them
// based on PayPal's response. It should be called periodically via a cron job.
//
// Recommended: Run every 5-15 minutes
//
// Vercel Cron config is in vercel.json
// Or use an external cron service to call this endpoint with the CRON_SECRET header.

export async function GET(request: NextRequest) {
  // Verify cron secret for security
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // Allow Vercel cron (no auth needed) or external with secret
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // Check if this is a Vercel cron request
    const isVercelCron = request.headers.get("x-vercel-cron") === "true";
    if (!isVercelCron) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const supabase = createServerClient();
  const results = {
    checked: 0,
    updated: 0,
    completed: 0,
    failed: 0,
    errors: [] as string[],
  };

  try {
    // Get all payouts that are still processing
    const { data: processingPayouts, error: fetchError } = await supabase
      .from("payouts")
      .select("id, affiliate_id, paypal_batch_id, paypal_payout_item_id, amount")
      .eq("status", "processing")
      .not("paypal_batch_id", "is", null);

    if (fetchError) {
      console.error("Error fetching processing payouts:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch payouts" },
        { status: 500 }
      );
    }

    if (!processingPayouts || processingPayouts.length === 0) {
      return NextResponse.json({
        message: "No processing payouts to check",
        results,
      });
    }

    // Group payouts by batch ID
    const batchGroups = processingPayouts.reduce(
      (acc, payout) => {
        const batchId = payout.paypal_batch_id!;
        if (!acc[batchId]) {
          acc[batchId] = [];
        }
        acc[batchId].push(payout);
        return acc;
      },
      {} as Record<string, typeof processingPayouts>
    );

    // Check each batch
    for (const [batchId, payouts] of Object.entries(batchGroups)) {
      results.checked += payouts.length;

      const statusResult = await checkPayoutBatchStatus(batchId);

      if (!statusResult.success) {
        results.errors.push(`Batch ${batchId}: ${statusResult.error}`);

        // Log error to error monitor
        await logSystemError({
          error_type: "paypal_error",
          severity: "warning",
          message: `Failed to check PayPal batch status: ${statusResult.error}`,
          source: "paypal_api",
          endpoint: "/api/cron/paypal-status",
          details: {
            batch_id: batchId,
            payout_count: payouts.length,
          },
        });

        continue;
      }

      // Update each payout based on item status
      for (const payout of payouts) {
        const itemStatus = statusResult.items?.find(
          (item) => item.affiliateId === payout.affiliate_id
        );

        if (!itemStatus) {
          // Item not found in response, might still be processing
          continue;
        }

        // Only update if status has changed from processing
        if (itemStatus.internalStatus === "processing") {
          continue;
        }

        results.updated++;

        if (itemStatus.internalStatus === "completed") {
          // Mark payout as completed
          await supabase
            .from("payouts")
            .update({
              status: "completed",
              completed_at: new Date().toISOString(),
              paypal_payout_item_id: itemStatus.payoutItemId,
            })
            .eq("id", payout.id);

          // Mark associated referrals as paid
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

          // Get affiliate for Klaviyo
          const { data: affiliate } = await supabase
            .from("affiliates")
            .select("email, first_name, last_name, referral_code, paypal_email")
            .eq("id", payout.affiliate_id)
            .single();

          if (affiliate) {
            // Track in Klaviyo
            await trackKlaviyoEvent(async (klaviyo) => {
              await klaviyo.trackAffiliatePayoutSent({
                affiliate: {
                  email: affiliate.email,
                  first_name: affiliate.first_name,
                  last_name: affiliate.last_name,
                  referral_code: affiliate.referral_code,
                },
                payout: {
                  id: payout.id,
                  amount: payout.amount,
                  method: "paypal",
                  paypal_email: affiliate.paypal_email,
                },
              });
            });
          }

          results.completed++;

          // Log success
          await supabase.from("activity_log").insert({
            affiliate_id: payout.affiliate_id,
            action: "payout_completed",
            details: {
              payout_id: payout.id,
              amount: payout.amount,
              batch_id: batchId,
              paypal_item_id: itemStatus.payoutItemId,
              source: "cron_poll",
            },
          });
        } else if (itemStatus.internalStatus === "failed") {
          // Mark payout as failed
          await supabase
            .from("payouts")
            .update({
              status: "failed",
              failure_reason: itemStatus.error || itemStatus.transactionStatus,
              paypal_payout_item_id: itemStatus.payoutItemId,
            })
            .eq("id", payout.id);

          results.failed++;

          // Log failure
          await supabase.from("activity_log").insert({
            affiliate_id: payout.affiliate_id,
            action: "payout_failed",
            details: {
              payout_id: payout.id,
              amount: payout.amount,
              batch_id: batchId,
              paypal_item_id: itemStatus.payoutItemId,
              error: itemStatus.error,
              transaction_status: itemStatus.transactionStatus,
              source: "cron_poll",
            },
          });

          // Log to error monitor
          await logSystemError({
            error_type: "payout_error",
            severity: "error",
            message: `PayPal payout failed: ${itemStatus.error || itemStatus.transactionStatus}`,
            source: "paypal_api",
            endpoint: "/api/cron/paypal-status",
            affiliate_id: payout.affiliate_id,
            payout_id: payout.id,
            details: {
              batch_id: batchId,
              paypal_item_id: itemStatus.payoutItemId,
              transaction_status: itemStatus.transactionStatus,
              amount: payout.amount,
            },
          });
        }
      }
    }

    // Log the cron run
    await supabase.from("activity_log").insert({
      action: "cron_paypal_status_check",
      details: {
        ...results,
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error("PayPal status polling error:", error);

    // Log to error monitor
    await logSystemError({
      error_type: "api_error",
      severity: "error",
      message: error instanceof Error ? error.message : "Unknown error in PayPal status polling",
      stack_trace: error instanceof Error ? error.stack : undefined,
      source: "admin_api",
      endpoint: "/api/cron/paypal-status",
      details: {
        results_before_error: results,
      },
    });

    return NextResponse.json(
      {
        error: "Polling failed",
        details: error instanceof Error ? error.message : "Unknown error",
        results,
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request);
}
