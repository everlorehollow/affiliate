import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AdminLayout } from "@/components/AdminLayout";
import { createServerClient } from "@/lib/supabase";
import { AffiliatesTable } from "./AffiliatesTable";

const ADMIN_USER_IDS = process.env.ADMIN_USER_IDS?.split(",") || [];

interface PageProps {
  searchParams: Promise<{ status?: string; search?: string }>;
}

export default async function AffiliatesPage({ searchParams }: PageProps) {
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
    .from("affiliates")
    .select("*")
    .order("created_at", { ascending: false });

  if (params.status) {
    query = query.eq("status", params.status);
  }

  if (params.search) {
    query = query.or(
      `email.ilike.%${params.search}%,first_name.ilike.%${params.search}%,last_name.ilike.%${params.search}%,referral_code.ilike.%${params.search}%`
    );
  }

  const { data: affiliates } = await query;

  // Get counts by status
  const [
    { count: allCount },
    { count: pendingCount },
    { count: approvedCount },
    { count: rejectedCount },
  ] = await Promise.all([
    supabase.from("affiliates").select("*", { count: "exact", head: true }),
    supabase.from("affiliates").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("affiliates").select("*", { count: "exact", head: true }).eq("status", "approved"),
    supabase.from("affiliates").select("*", { count: "exact", head: true }).eq("status", "rejected"),
  ]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-red-500">Affiliates</h1>
            <p className="text-gray-400 mt-1">Manage affiliate accounts</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex gap-2">
            <StatusFilter status={undefined} currentStatus={params.status} count={allCount || 0} label="All" />
            <StatusFilter status="pending" currentStatus={params.status} count={pendingCount || 0} label="Pending" />
            <StatusFilter status="approved" currentStatus={params.status} count={approvedCount || 0} label="Approved" />
            <StatusFilter status="rejected" currentStatus={params.status} count={rejectedCount || 0} label="Rejected" />
          </div>

          <form className="flex-1 max-w-md">
            <input
              type="search"
              name="search"
              defaultValue={params.search}
              placeholder="Search by email, name, or code..."
              className="w-full px-4 py-2 bg-[#2c0046] border border-red-500/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50"
            />
          </form>
        </div>

        {/* Table */}
        <AffiliatesTable affiliates={affiliates || []} />
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
  const href = status ? `/admin/affiliates?status=${status}` : "/admin/affiliates";

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
