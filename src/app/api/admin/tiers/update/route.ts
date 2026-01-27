import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

const ADMIN_USER_IDS = process.env.ADMIN_USER_IDS?.split(",") || [];

export async function POST(request: NextRequest) {
  const { userId } = await auth();

  if (!userId || !ADMIN_USER_IDS.includes(userId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await request.json();

  if (!data.id || !data.name) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const supabase = createServerClient();

  const { error } = await supabase
    .from("tiers")
    .update({
      name: data.name,
      description: data.description || null,
      min_referrals: data.min_referrals || 0,
      commission_rate: data.commission_rate || 0.1,
      perks: data.perks || null,
    })
    .eq("id", data.id);

  if (error) {
    console.error("Error updating tier:", error);
    return NextResponse.json({ error: "Failed to update tier" }, { status: 500 });
  }

  // If commission rate changed, update all affiliates in that tier
  const { data: tier } = await supabase
    .from("tiers")
    .select("slug, commission_rate")
    .eq("id", data.id)
    .single();

  if (tier) {
    await supabase
      .from("affiliates")
      .update({ commission_rate: tier.commission_rate })
      .eq("tier", tier.slug);
  }

  await supabase.from("activity_log").insert({
    action: "tier_updated",
    details: {
      updated_by: userId,
      tier_id: data.id,
      tier_name: data.name,
      commission_rate: data.commission_rate,
    },
  });

  return NextResponse.json({ success: true });
}
