import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AdminLayout } from "@/components/AdminLayout";
import { createServerClient } from "@/lib/supabase";
import { ErrorsTable } from "./ErrorsTable";

const ADMIN_USER_IDS = process.env.ADMIN_USER_IDS?.split(",") || [];

interface PageProps {
  searchParams: Promise<{
    severity?: string;
    source?: string;
    resolved?: string;
    page?: string;
  }>;
}

export default async function ErrorsPage({ searchParams }: PageProps) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  if (!ADMIN_USER_IDS.includes(userId)) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const perPage = 25;
  const offset = (page - 1) * perPage;

  const supabase = createServerClient();

  // Build query with filters
  let query = supabase
    .from("system_errors")
    .select("*, affiliates(email, first_name, last_name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + perPage - 1);

  // Apply filters
  if (params.severity) {
    query = query.eq("severity", params.severity);
  }

  if (params.source) {
    query = query.eq("source", params.source);
  }

  if (params.resolved === "true") {
    query = query.eq("resolved", true);
  } else if (params.resolved === "false" || !params.resolved) {
    // Default to showing unresolved
    query = query.eq("resolved", false);
  }

  const { data: errors, count } = await query;

  // Get counts by severity for unresolved errors
  const [
    { count: criticalCount },
    { count: errorCount },
    { count: warningCount },
    { count: infoCount },
  ] = await Promise.all([
    supabase
      .from("system_errors")
      .select("*", { count: "exact", head: true })
      .eq("resolved", false)
      .eq("severity", "critical"),
    supabase
      .from("system_errors")
      .select("*", { count: "exact", head: true })
      .eq("resolved", false)
      .eq("severity", "error"),
    supabase
      .from("system_errors")
      .select("*", { count: "exact", head: true })
      .eq("resolved", false)
      .eq("severity", "warning"),
    supabase
      .from("system_errors")
      .select("*", { count: "exact", head: true })
      .eq("resolved", false)
      .eq("severity", "info"),
  ]);

  // Get unique sources for filter
  const { data: sources } = await supabase
    .from("system_errors")
    .select("source")
    .order("source");

  const uniqueSources = [...new Set(sources?.map((s) => s.source))];
  const totalPages = Math.ceil((count || 0) / perPage);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-red-500">Error Monitor</h1>
            <p className="text-gray-400 mt-1">
              Track and resolve system errors
            </p>
          </div>
        </div>

        {/* Severity Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-red-900/30 border border-red-500/40 rounded-lg p-4">
            <p className="text-sm text-red-400 font-medium">Critical</p>
            <p className="text-3xl font-bold text-red-500">{criticalCount || 0}</p>
          </div>
          <div className="bg-orange-900/30 border border-orange-500/40 rounded-lg p-4">
            <p className="text-sm text-orange-400 font-medium">Error</p>
            <p className="text-3xl font-bold text-orange-500">{errorCount || 0}</p>
          </div>
          <div className="bg-yellow-900/30 border border-yellow-500/40 rounded-lg p-4">
            <p className="text-sm text-yellow-400 font-medium">Warning</p>
            <p className="text-3xl font-bold text-yellow-500">{warningCount || 0}</p>
          </div>
          <div className="bg-blue-900/30 border border-blue-500/40 rounded-lg p-4">
            <p className="text-sm text-blue-400 font-medium">Info</p>
            <p className="text-3xl font-bold text-blue-500">{infoCount || 0}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 bg-[#2c0046] border border-red-500/20 rounded-lg p-4">
          <select
            defaultValue={params.severity || ""}
            className="px-4 py-2 bg-[#1a0a2e] border border-red-500/20 rounded-lg text-white"
          >
            <option value="">All Severities</option>
            <option value="critical">Critical</option>
            <option value="error">Error</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>

          <select
            defaultValue={params.source || ""}
            className="px-4 py-2 bg-[#1a0a2e] border border-red-500/20 rounded-lg text-white"
          >
            <option value="">All Sources</option>
            {uniqueSources.map((source) => (
              <option key={source} value={source}>
                {source.replace(/_/g, " ")}
              </option>
            ))}
          </select>

          <select
            defaultValue={params.resolved || "false"}
            className="px-4 py-2 bg-[#1a0a2e] border border-red-500/20 rounded-lg text-white"
          >
            <option value="false">Unresolved</option>
            <option value="true">Resolved</option>
            <option value="all">All</option>
          </select>

          {(params.severity || params.source || params.resolved === "true") && (
            <a
              href="/admin/errors"
              className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Clear Filters
            </a>
          )}
        </div>

        {/* Errors Table */}
        <ErrorsTable
          errors={errors || []}
          currentPage={page}
          totalPages={totalPages}
          totalCount={count || 0}
          filters={params}
        />
      </div>
    </AdminLayout>
  );
}
