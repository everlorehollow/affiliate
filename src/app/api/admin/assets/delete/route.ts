import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

const ADMIN_USER_IDS = process.env.ADMIN_USER_IDS?.split(",") || [];

export async function POST(request: NextRequest) {
  const { userId } = await auth();

  if (!userId || !ADMIN_USER_IDS.includes(userId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await request.json();

  if (!id) {
    return NextResponse.json({ error: "Missing asset ID" }, { status: 400 });
  }

  const supabase = createServerClient();

  // Get asset name for logging
  const { data: asset } = await supabase
    .from("marketing_assets")
    .select("name")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("marketing_assets").delete().eq("id", id);

  if (error) {
    console.error("Error deleting asset:", error);
    return NextResponse.json({ error: "Failed to delete asset" }, { status: 500 });
  }

  await supabase.from("activity_log").insert({
    action: "asset_deleted",
    details: { deleted_by: userId, asset_id: id, asset_name: asset?.name },
  });

  return NextResponse.json({ success: true });
}
