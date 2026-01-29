import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/DashboardLayout";
import { createServerClient } from "@/lib/supabase";

export default async function HelpPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const supabase = createServerClient();

  // Get affiliate data for referral code display
  const { data: affiliate } = await supabase
    .from("affiliates")
    .select("referral_code, status")
    .eq("clerk_user_id", userId)
    .single();

  // Get tier info for commission rates
  const { data: tiers } = await supabase
    .from("tiers")
    .select("name, commission_rate, min_referrals")
    .order("sort_order");

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-[#d4af37]">Help Center</h1>
          <p className="text-gray-400 mt-1">
            Everything you need to know about the affiliate program
          </p>
        </div>

        {/* Getting Started */}
        <section className="bg-[#2c0046] border border-[#d4af37]/20 rounded-lg p-6">
          <h2 className="text-2xl font-semibold text-[#d4af37] mb-4">
            Getting Started
          </h2>
          <div className="space-y-4 text-gray-300">
            <div>
              <h3 className="text-lg font-medium text-white mb-2">1. Share Your Code</h3>
              <p>
                Your unique referral code is{" "}
                {affiliate?.referral_code ? (
                  <code className="px-2 py-1 bg-[#1a0a2e] text-[#d4af37] rounded font-mono">
                    {affiliate.referral_code}
                  </code>
                ) : (
                  <span className="text-gray-500">(available after approval)</span>
                )}
                . Share it on social media, in videos, or anywhere your audience finds you.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium text-white mb-2">2. Customer Uses Your Code</h3>
              <p>
                When someone uses your code at checkout, they get <span className="text-[#d4af37]">10% off</span> their order.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium text-white mb-2">3. You Earn Commission</h3>
              <p>
                You earn a percentage of every sale. Your commission rate increases as you refer more customers.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium text-white mb-2">4. Recurring Revenue</h3>
              <p>
                When a customer subscribes using your code, you earn commission on <span className="text-[#d4af37]">every renewal</span>, not just the first order. This means ongoing passive income.
              </p>
            </div>
          </div>
        </section>

        {/* Commission Tiers */}
        <section className="bg-[#2c0046] border border-[#d4af37]/20 rounded-lg p-6">
          <h2 className="text-2xl font-semibold text-[#d4af37] mb-4">
            Commission Tiers
          </h2>
          <p className="text-gray-300 mb-4">
            Your commission rate increases automatically as you hit referral milestones.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#d4af37]/20">
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Tier</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Referrals</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Commission</th>
                </tr>
              </thead>
              <tbody className="text-gray-300">
                {tiers?.map((tier) => (
                  <tr key={tier.name} className="border-b border-[#d4af37]/10">
                    <td className="py-3 px-4 font-medium text-white">{tier.name}</td>
                    <td className="py-3 px-4">{tier.min_referrals}+ referrals</td>
                    <td className="py-3 px-4 text-[#d4af37] font-semibold">
                      {(tier.commission_rate * 100).toFixed(0)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Payouts */}
        <section className="bg-[#2c0046] border border-[#d4af37]/20 rounded-lg p-6">
          <h2 className="text-2xl font-semibold text-[#d4af37] mb-4">
            Payouts
          </h2>
          <div className="space-y-4 text-gray-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#1a0a2e] rounded-lg p-4">
                <p className="text-sm text-gray-400 mb-1">Minimum Payout</p>
                <p className="text-xl font-semibold text-white">$25</p>
              </div>
              <div className="bg-[#1a0a2e] rounded-lg p-4">
                <p className="text-sm text-gray-400 mb-1">Payout Method</p>
                <p className="text-xl font-semibold text-white">PayPal</p>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-medium text-white mb-2">How It Works</h3>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-[#d4af37]">1.</span>
                  <span>Commissions are held for 30 days after each sale (refund protection period)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#d4af37]">2.</span>
                  <span>After 30 days, the commission moves to your available balance</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#d4af37]">3.</span>
                  <span>Once you have $25+ available, payouts are processed monthly via PayPal</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#d4af37]">4.</span>
                  <span>Make sure your PayPal email is correct in Settings</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Tracking & Dashboard */}
        <section className="bg-[#2c0046] border border-[#d4af37]/20 rounded-lg p-6">
          <h2 className="text-2xl font-semibold text-[#d4af37] mb-4">
            Your Dashboard
          </h2>
          <div className="space-y-4 text-gray-300">
            <p>Your dashboard shows real-time stats including:</p>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <li className="flex items-center gap-2">
                <span className="text-lg">👥</span>
                <span><strong>Total Referrals</strong> — customers who used your code</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-lg">📈</span>
                <span><strong>Total Revenue</strong> — sales generated by your referrals</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-lg">💰</span>
                <span><strong>Total Earnings</strong> — commission you have earned</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-lg">🏦</span>
                <span><strong>Available Balance</strong> — ready for payout</span>
              </li>
            </ul>
            <p className="text-sm text-gray-400 mt-4">
              Visit the <strong>Referrals</strong> page to see individual orders and their status.
            </p>
          </div>
        </section>

        {/* Tips for Success */}
        <section className="bg-[#2c0046] border border-[#d4af37]/20 rounded-lg p-6">
          <h2 className="text-2xl font-semibold text-[#d4af37] mb-4">
            Tips for Success
          </h2>
          <div className="space-y-3 text-gray-300">
            <div className="flex items-start gap-3">
              <span className="text-[#d4af37] text-lg">✦</span>
              <p><strong>Be authentic</strong> — Share why you genuinely love Everlore Hollow</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-[#d4af37] text-lg">✦</span>
              <p><strong>Remind your audience</strong> — Mention your code regularly, not just once</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-[#d4af37] text-lg">✦</span>
              <p><strong>Use our assets</strong> — Download images and videos from the Assets page</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-[#d4af37] text-lg">✦</span>
              <p><strong>Focus on trust</strong> — You do not need a massive following, just people who trust your taste</p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-[#2c0046] border border-[#d4af37]/20 rounded-lg p-6">
          <h2 className="text-2xl font-semibold text-[#d4af37] mb-4">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-white mb-2">
                When do I get paid?
              </h3>
              <p className="text-gray-300">
                Payouts are processed monthly. Commissions have a 30-day hold period before they become available. Once you have $25+ in your available balance, you will be included in the next payout cycle.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium text-white mb-2">
                How do I update my PayPal email?
              </h3>
              <p className="text-gray-300">
                Go to the <strong>Settings</strong> page and update your PayPal email under Payout Settings.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium text-white mb-2">
                What happens if a customer gets a refund?
              </h3>
              <p className="text-gray-300">
                If a customer refunds within the 30-day hold period, the commission is automatically removed. This is why we hold commissions before making them available.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium text-white mb-2">
                Do I earn on subscription renewals?
              </h3>
              <p className="text-gray-300">
                Yes! When a customer subscribes using your code, you earn commission on the initial order <strong>and</strong> every future renewal. This is lifetime attribution.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium text-white mb-2">
                How do I move up a tier?
              </h3>
              <p className="text-gray-300">
                Tiers upgrade automatically when you hit the referral threshold. You can see your progress on the Dashboard.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium text-white mb-2">
                Can I use my own code?
              </h3>
              <p className="text-gray-300">
                No, self-referrals are not allowed. Your code is for sharing with your audience.
              </p>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="bg-[#1a0a2e] border border-[#d4af37]/30 rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-[#d4af37] mb-2">
            Still have questions?
          </h2>
          <p className="text-gray-300">
            Contact us at{" "}
            <a
              href="mailto:affiliates@everlorehollow.com"
              className="text-[#d4af37] hover:underline"
            >
              affiliates@everlorehollow.com
            </a>
          </p>
        </section>
      </div>
    </DashboardLayout>
  );
}
