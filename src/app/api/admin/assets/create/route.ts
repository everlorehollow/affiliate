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

  if (!data.name || !data.file_url || !data.asset_type) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const supabase = createServerClient();

  const { error } = await supabase.from("marketing_assets").insert({
    name: data.name,
    description: data.description || null,
    asset_type: data.asset_type,
    file_url: data.file_url,
    thumbnail_url: data.thumbnail_url || null,
    min_tier: data.min_tier || "initiate",
    sort_order: data.sort_order || 0,
  });

  if (error) {
    console.error("Error creating asset:", error);
    return NextResponse.json({ error: "Failed to create asset" }, { status: 500 });
  }

  await supabase.from("activity_log").insert({
    action: "asset_created",
    details: { created_by: userId, asset_name: data.name },
  });

  return NextResponse.json({ success: true });
}
