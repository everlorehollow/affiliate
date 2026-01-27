import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AdminLayout } from "@/components/AdminLayout";
import { createServerClient } from "@/lib/supabase";
import { ReferralsTable } from "./ReferralsTable";

const ADMIN_USER_IDS = process.env.ADMIN_USER_IDS?.split(",") || [];

interface PageProps {
  searchParams: Promise<{ status?: string; affiliate?: string }>;
}

export default async function ReferralsPage({ searchParams }: PageProps) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  if (!ADMIN_USER_IDS.includes(userId)) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const supabase = createServerClient();

  let query = supabase
    .from("referrals")
    .select("*, affiliates(email, first_name, last_name, referral_code)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (params.status) {
    query = query.eq("status", params.status);
  }

  if (params.affiliate) {
    query = query.eq("affiliate_id", params.affiliate);
  }

  const { data: referrals } = await query;

  // Get counts
  const [
    { count: allCount },
    { count: pendingCount },
    { count: approvedCount },
    { count: paidCount },
  ] = await Promise.all([
    supabase.from("referrals").select("*", { count: "exact", head: true }),
    supabase.from("referrals").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("referrals").select("*", { count: "exact", head: true }).eq("status", "approved"),
    supabase.from("referrals").select("*", { count: "exact", head: true }).eq("status", "paid"),
  ]);

  // Calculate totals for current filter
  const totalCommission = referrals?.reduce((sum, r) => sum + (r.commission_amount || 0), 0) || 0;
  const totalRevenue = referrals?.reduce((sum, r) => sum + (r.order_total || 0), 0) || 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-red-500">Referrals</h1>
            <p className="text-gray-400 mt-1">View and manage commission referrals</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400">
              Showing {referrals?.length || 0} referrals
            </p>
            <p className="text-lg text-white font-medium">
              ${totalRevenue.toFixed(2)} revenue | ${totalCommission.toFixed(2)} commission
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex gap-2">
            <StatusFilter status={undefined} currentStatus={params.status} count={allCount || 0} label="All" />
            <StatusFilter status="pending" currentStatus={params.status} count={pendingCount || 0} label="Pending" />
            <StatusFilter status="approved" currentStatus={params.status} count={approvedCount || 0} label="Approved" />
            <StatusFilter status="paid" currentStatus={params.status} count={paidCount || 0} label="Paid" />
          </div>
        </div>

        {/* Table */}
        <ReferralsTable referrals={referrals || []} />
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
  const href = status ? `/admin/referrals?status=${status}` : "/admin/referrals";

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
