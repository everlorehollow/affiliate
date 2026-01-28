import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase";
import { ActivityFilters } from "./ActivityFilters";

const ADMIN_USER_IDS = process.env.ADMIN_USER_IDS?.split(",") || [];

interface PageProps {
  searchParams: Promise<{ action?: string; affiliate?: string; page?: string }>;
}

export default async function ActivityPage({ searchParams }: PageProps) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  if (!ADMIN_USER_IDS.includes(userId)) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const perPage = 50;
  const offset = (page - 1) * perPage;

  const supabase = createServerClient();

  let query = supabase
    .from("activity_log")
    .select("*, affiliates(email, first_name, last_name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + perPage - 1);

  if (params.action) {
    query = query.eq("action", params.action);
  }

  if (params.affiliate) {
    query = query.eq("affiliate_id", params.affiliate);
  }

  const { data: activities, count } = await query;

  // Get unique action types for filter
  const { data: actionTypes } = await supabase
    .from("activity_log")
    .select("action")
    .order("action");

  const uniqueActions = [...new Set(actionTypes?.map((a) => a.action))];
  const totalPages = Math.ceil((count || 0) / perPage);

  const actionIcons: Record<string, string> = {
    signup: "🆕",
    approved: "✅",
    rejected: "❌",
    referral: "🔗",
    referral_approved: "✓",
    referral_rejected: "✗",
    referral_paid: "💵",
    payout: "💸",
    payout_pending: "⏳",
    payout_processing: "🔄",
    payout_completed: "✅",
    payout_failed: "❌",
    payouts_created: "📝",
    tier_upgrade: "⬆️",
    login: "🔑",
    webhook_shopify: "🛒",
    webhook_recharge: "🔄",
    webhook_error: "⚠️",
    asset_created: "📁",
    asset_updated: "✏️",
    asset_deleted: "🗑️",
    bulk_status_change: "📋",
    bulk_referral_status_change: "📋",
    status_changed_pending: "⏳",
    status_changed_approved: "✅",
    status_changed_rejected: "❌",
    status_changed_inactive: "💤",
    cron_paypal_status_check: "⏰",
    paypal_webhook_error: "⚠️",
    paypal_status_check: "🔍",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-red-500">Activity Log</h1>
          <p className="text-gray-400 mt-1">
            {count || 0} total events
          </p>
        </div>
      </div>

      {/* Filters */}
      <ActivityFilters
        uniqueActions={uniqueActions}
        currentAction={params.action}
      />

      {/* Activity List */}
      <div className="bg-[#2c0046] border border-red-500/20 rounded-lg overflow-hidden">
        <div className="divide-y divide-gray-700/50">
          {activities?.map((activity) => (
            <div
              key={activity.id}
              className="p-4 hover:bg-[#1a0a2e]/50 transition-colors"
            >
              <div className="flex items-start gap-4">
                <span className="text-2xl">
                  {actionIcons[activity.action] || "📝"}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <p className="text-white font-medium capitalize">
                      {activity.action.replace(/_/g, " ")}
                    </p>
                    <span className="text-xs text-gray-500">
                      {new Date(activity.created_at).toLocaleString()}
                    </span>
                  </div>
                  {activity.affiliates && (
                    <p className="text-sm text-gray-400 mt-1">
                      Affiliate: {activity.affiliates.first_name} {activity.affiliates.last_name} ({activity.affiliates.email})
                    </p>
                  )}
                  {activity.details && (
                    <pre className="text-xs text-gray-500 mt-2 bg-[#1a0a2e] p-2 rounded overflow-auto max-h-32">
                      {JSON.stringify(activity.details, null, 2)}
                    </pre>
                  )}
                  {activity.ip_address && (
                    <p className="text-xs text-gray-500 mt-1">
                      IP: {activity.ip_address}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
          {(!activities || activities.length === 0) && (
            <div className="p-8 text-center text-gray-500">
              No activity found
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {page > 1 && (
            <a
              href={`/admin/activity?page=${page - 1}${params.action ? `&action=${params.action}` : ""}`}
              className="px-4 py-2 bg-[#2c0046] border border-red-500/20 rounded-lg text-gray-400 hover:text-white transition-colors"
            >
              Previous
            </a>
          )}
          <span className="px-4 py-2 text-gray-400">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <a
              href={`/admin/activity?page=${page + 1}${params.action ? `&action=${params.action}` : ""}`}
              className="px-4 py-2 bg-[#2c0046] border border-red-500/20 rounded-lg text-gray-400 hover:text-white transition-colors"
            >
              Next
            </a>
          )}
        </div>
      )}
    </div>
  );
}
