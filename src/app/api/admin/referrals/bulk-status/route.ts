import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

const ADMIN_USER_IDS = process.env.ADMIN_USER_IDS?.split(",") || [];

export async function POST(request: NextRequest) {
  const { userId } = await auth();

  if (!userId || !ADMIN_USER_IDS.includes(userId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { referralIds, status } = await request.json();

  if (!referralIds || !Array.isArray(referralIds) || referralIds.length === 0 || !status) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const validStatuses = ["pending", "approved", "paid", "refunded", "rejected"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const supabase = createServerClient();

  const updateData: Record<string, string | null> = {
    status,
  };

  if (status === "approved") {
    updateData.approved_at = new Date().toISOString();
  } else if (status === "paid") {
    updateData.paid_at = new Date().toISOString();
  }

  // Get affected affiliate IDs before updating
  const { data: referrals } = await supabase
    .from("referrals")
    .select("affiliate_id")
    .in("id", referralIds);

  const { error } = await supabase
    .from("referrals")
    .update(updateData)
    .in("id", referralIds);

  if (error) {
    console.error("Error updating referral statuses:", error);
    return NextResponse.json({ error: "Failed to update statuses" }, { status: 500 });
  }

  // Recalculate stats for all affected affiliates
  const affiliateIds = [...new Set(referrals?.map((r) => r.affiliate_id).filter(Boolean))];
  for (const affiliateId of affiliateIds) {
    await supabase.rpc("recalculate_affiliate_stats", {
      affiliate_uuid: affiliateId,
    });
  }

  // Log the bulk action
  await supabase.from("activity_log").insert({
    action: "bulk_referral_status_change",
    details: {
      changed_by: userId,
      new_status: status,
      referral_count: referralIds.length,
      referral_ids: referralIds,
    },
  });

  return NextResponse.json({ success: true, count: referralIds.length });
}
