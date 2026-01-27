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

  if (!data.id) {
    return NextResponse.json({ error: "Missing affiliate ID" }, { status: 400 });
  }

  const supabase = createServerClient();

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  // Only update fields that are provided
  const allowedFields = [
    "first_name",
    "last_name",
    "email",
    "tier",
    "commission_rate",
    "status",
    "paypal_email",
    "referral_code",
    "discount_code",
    "instagram_handle",
    "tiktok_handle",
    "youtube_channel",
    "website_url",
    "bio",
  ];

  for (const field of allowedFields) {
    if (field in data) {
      updateData[field] = data[field] || null;
    }
  }

  // If status changed to approved, set approved_at
  if (data.status === "approved") {
    const { data: current } = await supabase
      .from("affiliates")
      .select("status, approved_at")
      .eq("id", data.id)
      .single();

    if (current && current.status !== "approved" && !current.approved_at) {
      updateData.approved_at = new Date().toISOString();
    }
  }

  const { error } = await supabase
    .from("affiliates")
    .update(updateData)
    .eq("id", data.id);

  if (error) {
    console.error("Error updating affiliate:", error);
    return NextResponse.json({ error: "Failed to update affiliate" }, { status: 500 });
  }

  // Log the action
  await supabase.from("activity_log").insert({
    affiliate_id: data.id,
    action: "affiliate_updated",
    details: { updated_by: userId, fields: Object.keys(updateData) },
  });

  return NextResponse.json({ success: true });
}
