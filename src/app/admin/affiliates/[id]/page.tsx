import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { AdminLayout } from "@/components/AdminLayout";
import { createServerClient } from "@/lib/supabase";
import { AffiliateDetail } from "./AffiliateDetail";

const ADMIN_USER_IDS = process.env.ADMIN_USER_IDS?.split(",") || [];

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AffiliatePage({ params }: PageProps) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  if (!ADMIN_USER_IDS.includes(userId)) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const supabase = createServerClient();

  const { data: affiliate } = await supabase
    .from("affiliates")
    .select("*")
    .eq("id", id)
    .single();

  if (!affiliate) {
    notFound();
  }

  // Get tiers for dropdown
  const { data: tiers } = await supabase
    .from("tiers")
    .select("*")
    .order("sort_order");

  // Get recent referrals
  const { data: referrals } = await supabase
    .from("referrals")
    .select("*")
    .eq("affiliate_id", id)
    .order("created_at", { ascending: false })
    .limit(10);

  // Get recent payouts
  const { data: payouts } = await supabase
    .from("payouts")
    .select("*")
    .eq("affiliate_id", id)
    .order("created_at", { ascending: false })
    .limit(5);

  // Get referred customers
  const { data: customers, count: customerCount } = await supabase
    .from("referred_customers")
    .select("*", { count: "exact" })
    .eq("affiliate_id", id)
    .order("created_at", { ascending: false })
    .limit(10);

  // Get recent activity
  const { data: activity } = await supabase
    .from("activity_log")
    .select("*")
    .eq("affiliate_id", id)
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <AdminLayout>
      <AffiliateDetail
        affiliate={affiliate}
        tiers={tiers || []}
        referrals={referrals || []}
        payouts={payouts || []}
        customers={customers || []}
        customerCount={customerCount || 0}
        activity={activity || []}
      />
    </AdminLayout>
  );
}
