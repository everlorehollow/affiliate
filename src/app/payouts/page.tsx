import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/DashboardLayout";
import { createServerClient } from "@/lib/supabase";

export default async function PayoutsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const supabase = createServerClient();

  // Get affiliate
  const { data: affiliate } = await supabase
    .from("affiliates")
    .select("*")
    .eq("clerk_user_id", userId)
    .single();

  if (!affiliate) {
    redirect("/dashboard");
  }

  // Get payouts
  const { data: payouts } = await supabase
    .from("payouts")
    .select("*")
    .eq("affiliate_id", affiliate.id)
    .order("created_at", { ascending: false });

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-[#d4af37]">Payouts</h1>
          <p className="text-gray-400 mt-1">View your payout history</p>
        </div>

        {/* Balance Card */}
        <div className="bg-[#2c0046] border border-[#d4af37]/20 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Available Balance</p>
              <p className="text-4xl font-bold text-[#d4af37] mt-1">
                ${affiliate.balance_owed.toFixed(2)}
              </p>
              {affiliate.balance_owed < 25 && (
                <p className="text-sm text-gray-400 mt-2">
                  Minimum $25 required for payout ({(25 - affiliate.balance_owed).toFixed(2)} more needed)
                </p>
              )}
            </div>
            {affiliate.paypal_email ? (
              <div className="text-right">
                <p className="text-sm text-gray-400">PayPal Email</p>
                <p className="text-sm text-gray-300">{affiliate.paypal_email}</p>
              </div>
            ) : (
              <div className="text-right">
                <p className="text-sm text-yellow-400">
                  Add PayPal email in Settings to receive payouts
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Payout History */}
        <div className="bg-[#2c0046] border border-[#d4af37]/20 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-[#d4af37]/10">
            <h2 className="text-lg font-semibold text-[#d4af37]">Payout History</h2>
          </div>
          <table className="w-full">
            <thead className="bg-[#1a0a2e]">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[#d4af37]">
                  Date
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[#d4af37]">
                  Method
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-[#d4af37]">
                  Amount
                </th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-[#d4af37]">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d4af37]/10">
              {payouts && payouts.length > 0 ? (
                payouts.map((payout) => (
                  <tr key={payout.id} className="hover:bg-[#d4af37]/5">
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {new Date(payout.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300 capitalize">
                      {payout.method}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#d4af37] text-right font-semibold">
                      ${payout.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <PayoutStatusBadge status={payout.status} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                    No payouts yet. Keep referring to earn commissions!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Info */}
        <div className="bg-[#1a0a2e] border border-[#d4af37]/10 rounded-lg p-6">
          <h3 className="text-sm font-semibold text-[#d4af37] mb-2">Payout Information</h3>
          <ul className="text-sm text-gray-400 space-y-1">
            <li>• Payouts are processed monthly via PayPal</li>
            <li>• Minimum payout threshold: $25</li>
            <li>• Commissions have a 30-day hold period (refund protection)</li>
            <li>• Make sure your PayPal email is set in Settings</li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
}

function PayoutStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-300",
    processing: "bg-blue-500/20 text-blue-300",
    completed: "bg-green-500/20 text-green-300",
    failed: "bg-red-500/20 text-red-300",
  };

  return (
    <span className={`px-2 py-1 rounded text-xs capitalize ${styles[status] || styles.pending}`}>
      {status}
    </span>
  );
}
