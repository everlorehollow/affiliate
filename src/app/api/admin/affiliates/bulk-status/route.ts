import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

const ADMIN_USER_IDS = process.env.ADMIN_USER_IDS?.split(",") || [];

export async function POST(request: NextRequest) {
  const { userId } = await auth();

  if (!userId || !ADMIN_USER_IDS.includes(userId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { affiliateIds, status } = await request.json();

  if (!affiliateIds || !Array.isArray(affiliateIds) || affiliateIds.length === 0 || !status) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const validStatuses = ["pending", "approved", "rejected", "inactive"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const supabase = createServerClient();

  const updateData: Record<string, string | null> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === "approved") {
    updateData.approved_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("affiliates")
    .update(updateData)
    .in("id", affiliateIds);

  if (error) {
    console.error("Error updating affiliate statuses:", error);
    return NextResponse.json({ error: "Failed to update statuses" }, { status: 500 });
  }

  // Log the bulk action
  await supabase.from("activity_log").insert({
    action: "bulk_status_change",
    details: {
      changed_by: userId,
      new_status: status,
      affiliate_count: affiliateIds.length,
      affiliate_ids: affiliateIds,
    },
  });

  return NextResponse.json({ success: true, count: affiliateIds.length });
}
