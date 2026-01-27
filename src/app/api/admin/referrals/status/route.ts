import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

const ADMIN_USER_IDS = process.env.ADMIN_USER_IDS?.split(",") || [];

export async function POST(request: NextRequest) {
  const { userId } = await auth();

  if (!userId || !ADMIN_USER_IDS.includes(userId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { referralId, status } = await request.json();

  if (!referralId || !status) {
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

  const { data: referral, error } = await supabase
    .from("referrals")
    .update(updateData)
    .eq("id", referralId)
    .select("affiliate_id")
    .single();

  if (error) {
    console.error("Error updating referral status:", error);
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }

  // Recalculate affiliate stats if we have an affiliate_id
  if (referral?.affiliate_id) {
    await supabase.rpc("recalculate_affiliate_stats", {
      affiliate_uuid: referral.affiliate_id,
    });
  }

  // Log the action
  await supabase.from("activity_log").insert({
    affiliate_id: referral?.affiliate_id,
    action: `referral_${status}`,
    details: { changed_by: userId, referral_id: referralId, new_status: status },
  });

  return NextResponse.json({ success: true });
}
