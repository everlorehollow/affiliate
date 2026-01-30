import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { trackKlaviyoEvent } from "@/lib/klaviyo";

const ADMIN_USER_IDS = process.env.ADMIN_USER_IDS?.split(",") || [];

export async function POST(request: NextRequest) {
  const { userId } = await auth();

  if (!userId || !ADMIN_USER_IDS.includes(userId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { affiliateId } = await request.json();

  if (!affiliateId) {
    return NextResponse.json({ error: "Missing affiliate ID" }, { status: 400 });
  }

  const supabase = createServerClient();

  // Snapshot current tier before recalculation
  const { data: before } = await supabase
    .from("affiliates")
    .select("tier, commission_rate, email, first_name, last_name, referral_code")
    .eq("id", affiliateId)
    .single();

  const { error } = await supabase.rpc("recalculate_affiliate_stats", {
    affiliate_uuid: affiliateId,
  });

  if (error) {
    console.error("Error recalculating stats:", error);
    return NextResponse.json({ error: "Failed to recalculate stats" }, { status: 500 });
  }

  // Also check for tier upgrade
  await supabase.rpc("check_tier_upgrade", {
    affiliate_uuid: affiliateId,
  });

  // Check if tier changed and send Klaviyo event
  if (before) {
    const { data: after } = await supabase
      .from("affiliates")
      .select("tier, commission_rate, total_referrals")
      .eq("id", affiliateId)
      .single();

    if (after && after.tier !== before.tier) {
      await trackKlaviyoEvent(async (klaviyo) => {
        await klaviyo.trackAffiliateTierUpgrade({
          email: before.email,
          first_name: before.first_name || undefined,
          last_name: before.last_name || undefined,
          referral_code: before.referral_code,
          old_tier: before.tier,
          new_tier: after.tier,
          old_commission_rate: before.commission_rate,
          new_commission_rate: after.commission_rate,
          total_referrals: after.total_referrals,
        });
      });
    }
  }

  // Log the action
  await supabase.from("activity_log").insert({
    affiliate_id: affiliateId,
    action: "stats_recalculated",
    details: { triggered_by: userId },
  });

  return NextResponse.json({ success: true });
}
