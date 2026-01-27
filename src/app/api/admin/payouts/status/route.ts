import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

const ADMIN_USER_IDS = process.env.ADMIN_USER_IDS?.split(",") || [];

export async function POST(request: NextRequest) {
  const { userId } = await auth();

  if (!userId || !ADMIN_USER_IDS.includes(userId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { payoutId, status, failureReason } = await request.json();

  if (!payoutId || !status) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const validStatuses = ["pending", "processing", "completed", "failed"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const supabase = createServerClient();

  // Get current payout to get affiliate_id and amount
  const { data: currentPayout, error: fetchError } = await supabase
    .from("payouts")
    .select("affiliate_id, amount, status")
    .eq("id", payoutId)
    .single();

  if (fetchError || !currentPayout) {
    return NextResponse.json({ error: "Payout not found" }, { status: 404 });
  }

  const updateData: Record<string, string | null> = {
    status,
  };

  if (status === "processing") {
    updateData.processed_at = new Date().toISOString();
  } else if (status === "completed") {
    updateData.completed_at = new Date().toISOString();
  } else if (status === "failed" && failureReason) {
    updateData.failure_reason = failureReason;
  }

  const { error } = await supabase
    .from("payouts")
    .update(updateData)
    .eq("id", payoutId);

  if (error) {
    console.error("Error updating payout status:", error);
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }

  // If completed, update affiliate balance and mark referrals as paid
  if (status === "completed" && currentPayout.affiliate_id) {
    // Mark all approved referrals for this affiliate as paid
    await supabase
      .from("referrals")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        payout_id: payoutId,
      })
      .eq("affiliate_id", currentPayout.affiliate_id)
      .eq("status", "approved");

    // Recalculate affiliate stats
    await supabase.rpc("recalculate_affiliate_stats", {
      affiliate_uuid: currentPayout.affiliate_id,
    });
  }

  // Log the action
  await supabase.from("activity_log").insert({
    affiliate_id: currentPayout.affiliate_id,
    action: `payout_${status}`,
    details: {
      changed_by: userId,
      payout_id: payoutId,
      new_status: status,
      amount: currentPayout.amount,
    },
  });

  return NextResponse.json({ success: true });
}
