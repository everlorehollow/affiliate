import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatsCard } from "@/components/StatsCard";
import { CopyButton } from "@/components/CopyButton";
import { createServerClient } from "@/lib/supabase";

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const supabase = createServerClient();

  // Get affiliate data
  const { data: affiliate } = await supabase
    .from("affiliates")
    .select("*")
    .eq("clerk_user_id", userId)
    .single();

  // Get tier info
  const { data: tiers } = await supabase
    .from("tiers")
    .select("*")
    .order("sort_order");

  const currentTier = tiers?.find((t) => t.slug === affiliate?.tier);
  const nextTier = tiers?.find((t) => t.sort_order === (currentTier?.sort_order || 0) + 1);

  // If no affiliate record exists, show onboarding
  if (!affiliate) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto text-center py-12">
          <h1 className="text-3xl font-bold text-[#d4af37] mb-4">
            Welcome to the Everlore Hollow Affiliate Program
          </h1>
          <p className="text-gray-300 mb-8">
            Your account has been created. Our team will review your application and
            you&apos;ll receive an email once approved.
          </p>
          <div className="bg-[#2c0046] border border-[#d4af37]/20 rounded-lg p-6">
            <p className="text-sm text-gray-400">Application Status</p>
            <p className="text-xl font-semibold text-yellow-400 mt-2">Pending Review</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Show pending status if not approved
  if (affiliate.status === "pending") {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto text-center py-12">
          <h1 className="text-3xl font-bold text-[#d4af37] mb-4">
            Application Under Review
          </h1>
          <p className="text-gray-300 mb-8">
            Thank you for applying! We&apos;re reviewing your application and will
            notify you via email once approved.
          </p>
          <div className="bg-[#2c0046] border border-[#d4af37]/20 rounded-lg p-6">
            <p className="text-sm text-gray-400">Status</p>
            <p className="text-xl font-semibold text-yellow-400 mt-2">Pending Approval</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const referralsToNextTier = nextTier
    ? nextTier.min_referrals - affiliate.total_referrals
    : 0;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-[#d4af37]">Dashboard</h1>
          <p className="text-gray-400 mt-1">
            Welcome back, {affiliate.first_name || "Affiliate"}!
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Total Referrals"
            value={affiliate.total_referrals}
            icon="👥"
          />
          <StatsCard
            title="Total Revenue"
            value={`$${affiliate.total_revenue.toFixed(2)}`}
            subtitle="Generated for Everlore"
            icon="📈"
          />
          <StatsCard
            title="Total Earnings"
            value={`$${affiliate.total_commission_earned.toFixed(2)}`}
            icon="💰"
          />
          <StatsCard
            title="Available Balance"
            value={`$${affiliate.balance_owed.toFixed(2)}`}
            subtitle={affiliate.balance_owed >= 25 ? "Ready for payout" : "Min $25 for payout"}
            icon="🏦"
          />
        </div>

        {/* Tier Progress */}
        <div className="bg-[#2c0046] border border-[#d4af37]/20 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-[#d4af37]">
                {currentTier?.name || "Initiate"} Tier
              </h2>
              <p className="text-sm text-gray-400">
                Commission Rate: {((affiliate.commission_rate || 0.1) * 100).toFixed(0)}%
              </p>
            </div>
            {nextTier && (
              <div className="text-right">
                <p className="text-sm text-gray-400">Next: {nextTier.name}</p>
                <p className="text-sm text-[#d4af37]">
                  {referralsToNextTier} more referral{referralsToNextTier !== 1 ? "s" : ""} needed
                </p>
              </div>
            )}
          </div>

          {nextTier && (
            <div className="w-full bg-[#1a0a2e] rounded-full h-3">
              <div
                className="bg-[#d4af37] h-3 rounded-full transition-all"
                style={{
                  width: `${Math.min(
                    (affiliate.total_referrals / nextTier.min_referrals) * 100,
                    100
                  )}%`,
                }}
              />
            </div>
          )}

          {/* Tier Perks */}
          {currentTier?.perks && (
            <div className="mt-4 pt-4 border-t border-[#d4af37]/10">
              <p className="text-sm text-gray-400 mb-2">Your Perks:</p>
              <ul className="space-y-1">
                {currentTier.perks.map((perk: string, i: number) => (
                  <li key={i} className="text-sm text-gray-300 flex items-center gap-2">
                    <span className="text-[#d4af37]">✦</span>
                    {perk}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Referral Code */}
        <div className="bg-[#2c0046] border border-[#d4af37]/20 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-[#d4af37] mb-4">Your Referral Code</h2>
          <div className="flex items-center gap-4">
            <code className="flex-1 bg-[#1a0a2e] px-4 py-3 rounded-lg text-lg font-mono text-[#d4af37] border border-[#d4af37]/30">
              {affiliate.referral_code}
            </code>
            <CopyButton text={affiliate.referral_code} />
          </div>
          <p className="text-sm text-gray-400 mt-4">
            Share this code with your audience. When they use it at checkout, they get 20% off
            and you earn commission!
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
