import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

const ADMIN_USER_IDS = process.env.ADMIN_USER_IDS?.split(",") || [];

export async function POST(request: NextRequest) {
  const { userId } = await auth();

  if (!userId || !ADMIN_USER_IDS.includes(userId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { affiliateIds, method } = await request.json();

  if (!affiliateIds || !Array.isArray(affiliateIds) || affiliateIds.length === 0) {
    return NextResponse.json({ error: "Missing affiliate IDs" }, { status: 400 });
  }

  const validMethods = ["paypal", "manual", "store_credit"];
  if (!validMethods.includes(method || "manual")) {
    return NextResponse.json({ error: "Invalid method" }, { status: 400 });
  }

  const supabase = createServerClient();

  // Get affiliate data
  const { data: affiliates, error: fetchError } = await supabase
    .from("affiliates")
    .select("id, email, balance_owed, paypal_email")
    .in("id", affiliateIds)
    .gte("balance_owed", 25);

  if (fetchError) {
    console.error("Error fetching affiliates:", fetchError);
    return NextResponse.json({ error: "Failed to fetch affiliates" }, { status: 500 });
  }

  if (!affiliates || affiliates.length === 0) {
    return NextResponse.json({ error: "No eligible affiliates found" }, { status: 400 });
  }

  // Create payouts for each affiliate
  const payouts = affiliates.map((affiliate) => ({
    affiliate_id: affiliate.id,
    amount: affiliate.balance_owed,
    method: method || "manual",
    paypal_email: affiliate.paypal_email,
    status: "pending",
  }));

  const { error: insertError } = await supabase.from("payouts").insert(payouts);

  if (insertError) {
    console.error("Error creating payouts:", insertError);
    return NextResponse.json({ error: "Failed to create payouts" }, { status: 500 });
  }

  // Log the action
  await supabase.from("activity_log").insert({
    action: "payouts_created",
    details: {
      created_by: userId,
      affiliate_count: affiliates.length,
      total_amount: affiliates.reduce((sum, a) => sum + a.balance_owed, 0),
      method,
    },
  });

  return NextResponse.json({
    success: true,
    count: affiliates.length,
    totalAmount: affiliates.reduce((sum, a) => sum + a.balance_owed, 0),
  });
}
