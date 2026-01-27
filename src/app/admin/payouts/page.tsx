import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AdminLayout } from "@/components/AdminLayout";
import { createServerClient } from "@/lib/supabase";
import { PayoutsTable } from "./PayoutsTable";
import { CreatePayoutForm } from "./CreatePayoutForm";

const ADMIN_USER_IDS = process.env.ADMIN_USER_IDS?.split(",") || [];

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function PayoutsPage({ searchParams }: PageProps) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  if (!ADMIN_USER_IDS.includes(userId)) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const supabase = createServerClient();

  // Get payouts
  let query = supabase
    .from("payouts")
    .select("*, affiliates(email, first_name, last_name, referral_code, paypal_email)")
    .order("created_at", { ascending: false });

  if (params.status) {
    query = query.eq("status", params.status);
  }

  const { data: payouts } = await query;

  // Get counts
  const [
    { count: allCount },
    { count: pendingCount },
    { count: processingCount },
    { count: completedCount },
    { count: failedCount },
  ] = await Promise.all([
    supabase.from("payouts").select("*", { count: "exact", head: true }),
    supabase.from("payouts").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("payouts").select("*", { count: "exact", head: true }).eq("status", "processing"),
    supabase.from("payouts").select("*", { count: "exact", head: true }).eq("status", "completed"),
    supabase.from("payouts").select("*", { count: "exact", head: true }).eq("status", "failed"),
  ]);

  // Get affiliates eligible for payout (balance >= $25)
  const { data: eligibleAffiliates } = await supabase
    .from("affiliates")
    .select("id, email, first_name, last_name, balance_owed, paypal_email")
    .eq("status", "approved")
    .gte("balance_owed", 25)
    .order("balance_owed", { ascending: false });

  const totalPending = payouts
    ?.filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-red-500">Payouts</h1>
            <p className="text-gray-400 mt-1">Manage affiliate commission payouts</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-[#2c0046] border border-red-500/20 rounded-lg p-4">
            <p className="text-sm text-gray-400">Pending Payouts</p>
            <p className="text-2xl font-bold text-yellow-400">${totalPending.toFixed(2)}</p>
          </div>
          <div className="bg-[#2c0046] border border-red-500/20 rounded-lg p-4">
            <p className="text-sm text-gray-400">Eligible Affiliates</p>
            <p className="text-2xl font-bold text-white">{eligibleAffiliates?.length || 0}</p>
          </div>
          <div className="bg-[#2c0046] border border-red-500/20 rounded-lg p-4">
            <p className="text-sm text-gray-400">Processing</p>
            <p className="text-2xl font-bold text-blue-400">{processingCount || 0}</p>
          </div>
          <div className="bg-[#2c0046] border border-red-500/20 rounded-lg p-4">
            <p className="text-sm text-gray-400">Completed</p>
            <p className="text-2xl font-bold text-green-400">{completedCount || 0}</p>
          </div>
        </div>

        {/* Create Payout Section */}
        {(eligibleAffiliates?.length || 0) > 0 && (
          <div className="bg-[#2c0046] border border-green-500/20 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-green-400 mb-4">Create Payouts</h2>
            <p className="text-gray-400 mb-4">
              {eligibleAffiliates?.length} affiliate{eligibleAffiliates?.length !== 1 ? "s" : ""} eligible for payout (balance {">"}= $25)
            </p>
            <CreatePayoutForm affiliates={eligibleAffiliates || []} />
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex gap-2">
            <StatusFilter status={undefined} currentStatus={params.status} count={allCount || 0} label="All" />
            <StatusFilter status="pending" currentStatus={params.status} count={pendingCount || 0} label="Pending" />
            <StatusFilter status="processing" currentStatus={params.status} count={processingCount || 0} label="Processing" />
            <StatusFilter status="completed" currentStatus={params.status} count={completedCount || 0} label="Completed" />
            <StatusFilter status="failed" currentStatus={params.status} count={failedCount || 0} label="Failed" />
          </div>
        </div>

        {/* Table */}
        <PayoutsTable payouts={payouts || []} />
      </div>
    </AdminLayout>
  );
}

function StatusFilter({
  status,
  currentStatus,
  count,
  label,
}: {
  status: string | undefined;
  currentStatus: string | undefined;
  count: number;
  label: string;
}) {
  const isActive = status === currentStatus;
  const href = status ? `/admin/payouts?status=${status}` : "/admin/payouts";

  return (
    <a
      href={href}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        isActive
          ? "bg-red-500/20 text-red-400 border border-red-500/30"
          : "text-gray-400 hover:bg-red-500/10 hover:text-red-400"
      }`}
    >
      {label} ({count})
    </a>
  );
}
