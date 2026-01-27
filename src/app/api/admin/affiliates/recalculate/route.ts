import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

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

  // Log the action
  await supabase.from("activity_log").insert({
    affiliate_id: affiliateId,
    action: "stats_recalculated",
    details: { triggered_by: userId },
  });

  return NextResponse.json({ success: true });
}
