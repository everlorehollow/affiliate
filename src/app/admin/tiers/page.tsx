import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AdminLayout } from "@/components/AdminLayout";
import { createServerClient } from "@/lib/supabase";
import { TiersManager } from "./TiersManager";

const ADMIN_USER_IDS = process.env.ADMIN_USER_IDS?.split(",") || [];

export default async function TiersPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  if (!ADMIN_USER_IDS.includes(userId)) {
    redirect("/dashboard");
  }

  const supabase = createServerClient();

  const { data: tiers } = await supabase
    .from("tiers")
    .select("*")
    .order("sort_order", { ascending: true });

  // Get affiliate counts per tier
  const { data: affiliateCounts } = await supabase
    .from("affiliates")
    .select("tier")
    .eq("status", "approved");

  const tierCounts: Record<string, number> = {};
  affiliateCounts?.forEach((a) => {
    tierCounts[a.tier] = (tierCounts[a.tier] || 0) + 1;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-red-500">Tiers</h1>
          <p className="text-gray-400 mt-1">Configure affiliate tier levels and commission rates</p>
        </div>

        <TiersManager tiers={tiers || []} tierCounts={tierCounts} />
      </div>
    </AdminLayout>
  );
}
