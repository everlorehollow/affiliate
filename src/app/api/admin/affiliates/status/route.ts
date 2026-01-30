import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { trackKlaviyoEvent } from "@/lib/klaviyo";
import { createAffiliateDiscount } from "@/lib/shopify";

const ADMIN_USER_IDS = process.env.ADMIN_USER_IDS?.split(",") || [];

export async function POST(request: NextRequest) {
  const { userId } = await auth();

  if (!userId || !ADMIN_USER_IDS.includes(userId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { affiliateId, status } = await request.json();

  if (!affiliateId || !status) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const validStatuses = ["pending", "approved", "rejected", "inactive"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const supabase = createServerClient();

  const updateData: Record<string, string | number | null> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === "approved") {
    updateData.approved_at = new Date().toISOString();
  }

  // Get affiliate data before update
  const { data: affiliate } = await supabase
    .from("affiliates")
    .select("*")
    .eq("id", affiliateId)
    .single();

  if (!affiliate) {
    return NextResponse.json({ error: "Affiliate not found" }, { status: 404 });
  }

  // If approving, create Shopify discount code first
  let shopifyDiscountCreated = false;
  if (status === "approved" && !affiliate.shopify_discount_id) {
    const affiliateName = [affiliate.first_name, affiliate.last_name]
      .filter(Boolean)
      .join(" ") || affiliate.email;

    const discountResult = await createAffiliateDiscount(
      affiliate.referral_code,
      affiliateName,
      10 // 10% discount for customers
    );

    if (!discountResult.success) {
      console.error("Failed to create Shopify discount:", discountResult.error);
      return NextResponse.json(
        { error: `Failed to create Shopify discount: ${discountResult.error}` },
        { status: 500 }
      );
    }

    shopifyDiscountCreated = true;
    updateData.shopify_discount_id = discountResult.discountId!;
    updateData.discount_code = discountResult.code!;

    // Log discount creation
    await supabase.from("activity_log").insert({
      affiliate_id: affiliateId,
      action: "shopify_discount_created",
      details: {
        discount_id: discountResult.discountId,
        code: discountResult.code,
      },
    });
  }

  const { error } = await supabase
    .from("affiliates")
    .update(updateData)
    .eq("id", affiliateId);

  if (error) {
    console.error("Error updating affiliate status:", error);
    return NextResponse.json({ error: `Failed to update status: ${error.message}` }, { status: 500 });
  }

  // Log the action
  await supabase.from("activity_log").insert({
    affiliate_id: affiliateId,
    action: status === "approved" ? "approved" : `status_changed_${status}`,
    details: {
      changed_by: userId,
      new_status: status,
      shopify_discount_created: shopifyDiscountCreated,
    },
  });

  // Track approval event in Klaviyo
  if (status === "approved") {
    await trackKlaviyoEvent(async (klaviyo) => {
      await klaviyo.trackAffiliateApproved({
        email: affiliate.email,
        first_name: affiliate.first_name,
        last_name: affiliate.last_name,
        referral_code: affiliate.referral_code,
        tier: affiliate.tier,
        commission_rate: affiliate.commission_rate,
      });
    });
  }

  return NextResponse.json({
    success: true,
    shopifyDiscountCreated,
  });
}
