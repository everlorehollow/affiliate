import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/DashboardLayout";
import { createServerClient } from "@/lib/supabase";

export default async function ReferralsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const supabase = createServerClient();

  // Get affiliate
  const { data: affiliate } = await supabase
    .from("affiliates")
    .select("id")
    .eq("clerk_user_id", userId)
    .single();

  if (!affiliate) {
    redirect("/dashboard");
  }

  // Get referrals
  const { data: referrals } = await supabase
    .from("referrals")
    .select("*")
    .eq("affiliate_id", affiliate.id)
    .order("created_at", { ascending: false });

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-[#d4af37]">Referrals</h1>
          <p className="text-gray-400 mt-1">Track your referral history and commissions</p>
        </div>

        {/* Referrals Table */}
        <div className="bg-[#2c0046] border border-[#d4af37]/20 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#1a0a2e]">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[#d4af37]">
                  Date
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[#d4af37]">
                  Order
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[#d4af37]">
                  Type
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-[#d4af37]">
                  Order Total
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-[#d4af37]">
                  Commission
                </th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-[#d4af37]">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d4af37]/10">
              {referrals && referrals.length > 0 ? (
                referrals.map((referral) => (
                  <tr key={referral.id} className="hover:bg-[#d4af37]/5">
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {new Date(referral.order_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {referral.order_number || referral.order_id}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {referral.is_recurring ? (
                        <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs">
                          Recurring
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs">
                          Initial
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300 text-right">
                      ${referral.order_subtotal.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#d4af37] text-right font-semibold">
                      ${referral.commission_amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <StatusBadge status={referral.status} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    No referrals yet. Share your code to start earning!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-300",
    approved: "bg-green-500/20 text-green-300",
    paid: "bg-blue-500/20 text-blue-300",
    refunded: "bg-red-500/20 text-red-300",
    rejected: "bg-gray-500/20 text-gray-300",
  };

  return (
    <span className={`px-2 py-1 rounded text-xs capitalize ${styles[status] || styles.pending}`}>
      {status}
    </span>
  );
}
