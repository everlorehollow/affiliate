import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AdminLayout } from "@/components/AdminLayout";
import { createServerClient } from "@/lib/supabase";
import { AssetsManager } from "./AssetsManager";

const ADMIN_USER_IDS = process.env.ADMIN_USER_IDS?.split(",") || [];

export default async function AssetsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  if (!ADMIN_USER_IDS.includes(userId)) {
    redirect("/dashboard");
  }

  const supabase = createServerClient();

  const { data: assets } = await supabase
    .from("marketing_assets")
    .select("*")
    .order("sort_order", { ascending: true });

  const { data: tiers } = await supabase
    .from("tiers")
    .select("slug, name")
    .order("sort_order", { ascending: true });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-red-500">Marketing Assets</h1>
            <p className="text-gray-400 mt-1">Manage promotional materials for affiliates</p>
          </div>
        </div>

        <AssetsManager assets={assets || []} tiers={tiers || []} />
      </div>
    </AdminLayout>
  );
}
