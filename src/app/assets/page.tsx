import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/DashboardLayout";
import { createServerClient } from "@/lib/supabase";

export default async function AssetsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const supabase = createServerClient();

  // Get affiliate
  const { data: affiliate } = await supabase
    .from("affiliates")
    .select("tier")
    .eq("clerk_user_id", userId)
    .single();

  if (!affiliate) {
    redirect("/dashboard");
  }

  // Get marketing assets (filter by tier in app logic)
  const { data: assets } = await supabase
    .from("marketing_assets")
    .select("*")
    .order("sort_order");

  // Tier hierarchy for filtering
  const tierHierarchy: Record<string, number> = {
    initiate: 1,
    adept: 2,
    inner_circle: 3,
  };

  const userTierLevel = tierHierarchy[affiliate.tier] || 1;

  // Filter assets based on user's tier
  const accessibleAssets = assets?.filter((asset) => {
    const assetTierLevel = tierHierarchy[asset.min_tier] || 1;
    return userTierLevel >= assetTierLevel;
  });

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-[#d4af37]">Marketing Assets</h1>
          <p className="text-gray-400 mt-1">
            Download images, videos, and materials to promote Everlore Hollow
          </p>
        </div>

        {/* Assets Grid */}
        {accessibleAssets && accessibleAssets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accessibleAssets.map((asset) => (
              <div
                key={asset.id}
                className="bg-[#2c0046] border border-[#d4af37]/20 rounded-lg overflow-hidden"
              >
                {/* Thumbnail */}
                {asset.thumbnail_url ? (
                  <div className="aspect-video bg-[#1a0a2e] relative">
                    <img
                      src={asset.thumbnail_url}
                      alt={asset.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2">
                      <AssetTypeBadge type={asset.asset_type} />
                    </div>
                  </div>
                ) : (
                  <div className="aspect-video bg-[#1a0a2e] flex items-center justify-center relative">
                    <AssetTypeIcon type={asset.asset_type} />
                    <div className="absolute top-2 right-2">
                      <AssetTypeBadge type={asset.asset_type} />
                    </div>
                  </div>
                )}

                {/* Info */}
                <div className="p-4">
                  <h3 className="font-semibold text-white mb-1">{asset.name}</h3>
                  {asset.description && (
                    <p className="text-sm text-gray-400 mb-4">{asset.description}</p>
                  )}
                  <a
                    href={asset.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#d4af37] hover:bg-[#b8962e] text-[#1a0a2e] text-sm font-semibold rounded transition-colors"
                  >
                    Download
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-[#2c0046] border border-[#d4af37]/20 rounded-lg p-12 text-center">
            <p className="text-gray-400">No marketing assets available yet.</p>
            <p className="text-sm text-gray-500 mt-2">
              Check back soon for promotional materials!
            </p>
          </div>
        )}

        {/* Locked Assets Preview */}
        {userTierLevel < 3 && (
          <div className="bg-[#1a0a2e] border border-[#d4af37]/10 rounded-lg p-6">
            <h3 className="text-sm font-semibold text-[#d4af37] mb-2">
              Unlock More Assets
            </h3>
            <p className="text-sm text-gray-400">
              Reach higher tiers to unlock exclusive marketing materials and promotional content.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function AssetTypeBadge({ type }: { type: string }) {
  const labels: Record<string, string> = {
    image: "Image",
    video: "Video",
    document: "Doc",
    link: "Link",
  };

  return (
    <span className="px-2 py-1 bg-[#1a0a2e]/80 text-[#d4af37] text-xs rounded">
      {labels[type] || type}
    </span>
  );
}

function AssetTypeIcon({ type }: { type: string }) {
  const icons: Record<string, string> = {
    image: "🖼️",
    video: "🎬",
    document: "📄",
    link: "🔗",
  };

  return <span className="text-4xl">{icons[type] || "📁"}</span>;
}
