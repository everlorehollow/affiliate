"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MarketingAsset } from "@/lib/database.types";

interface AssetsManagerProps {
  assets: MarketingAsset[];
  tiers: { slug: string; name: string }[];
}

export function AssetsManager({ assets, tiers }: AssetsManagerProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingAsset, setEditingAsset] = useState<MarketingAsset | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    asset_type: "image",
    file_url: "",
    thumbnail_url: "",
    min_tier: "initiate",
    sort_order: 0,
  });

  function openEditForm(asset: MarketingAsset) {
    setEditingAsset(asset);
    setFormData({
      name: asset.name,
      description: asset.description || "",
      asset_type: asset.asset_type,
      file_url: asset.file_url,
      thumbnail_url: asset.thumbnail_url || "",
      min_tier: asset.min_tier,
      sort_order: asset.sort_order,
    });
    setShowForm(true);
  }

  function openNewForm() {
    setEditingAsset(null);
    setFormData({
      name: "",
      description: "",
      asset_type: "image",
      file_url: "",
      thumbnail_url: "",
      min_tier: "initiate",
      sort_order: assets.length,
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading("form");

    try {
      const url = editingAsset
        ? "/api/admin/assets/update"
        : "/api/admin/assets/create";

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editingAsset ? { ...formData, id: editingAsset.id } : formData
        ),
      });

      if (!res.ok) {
        throw new Error("Failed to save asset");
      }

      setShowForm(false);
      router.refresh();
    } catch (error) {
      console.error("Error saving asset:", error);
      alert("Failed to save asset");
    } finally {
      setLoading(null);
    }
  }

  async function deleteAsset(id: string) {
    if (!confirm("Are you sure you want to delete this asset?")) return;

    setLoading(id);
    try {
      const res = await fetch("/api/admin/assets/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) {
        throw new Error("Failed to delete asset");
      }

      router.refresh();
    } catch (error) {
      console.error("Error deleting asset:", error);
      alert("Failed to delete asset");
    } finally {
      setLoading(null);
    }
  }

  const assetTypeIcons: Record<string, string> = {
    image: "🖼️",
    video: "🎬",
    document: "📄",
    link: "🔗",
  };

  const tierColors: Record<string, string> = {
    initiate: "text-gray-400 bg-gray-500/20",
    adept: "text-blue-400 bg-blue-500/20",
    inner_circle: "text-purple-400 bg-purple-500/20",
  };

  return (
    <div className="space-y-6">
      {/* Add Button */}
      <button
        onClick={openNewForm}
        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors"
      >
        + Add New Asset
      </button>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#2c0046] border border-red-500/20 rounded-lg p-6 w-full max-w-lg mx-4">
            <h2 className="text-xl font-semibold text-red-400 mb-4">
              {editingAsset ? "Edit Asset" : "Add New Asset"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-2 bg-[#1a0a2e] border border-red-500/20 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 bg-[#1a0a2e] border border-red-500/20 rounded-lg text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Type</label>
                  <select
                    value={formData.asset_type}
                    onChange={(e) => setFormData({ ...formData, asset_type: e.target.value })}
                    className="w-full px-4 py-2 bg-[#1a0a2e] border border-red-500/20 rounded-lg text-white"
                  >
                    <option value="image">Image</option>
                    <option value="video">Video</option>
                    <option value="document">Document</option>
                    <option value="link">Link</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Min Tier</label>
                  <select
                    value={formData.min_tier}
                    onChange={(e) => setFormData({ ...formData, min_tier: e.target.value })}
                    className="w-full px-4 py-2 bg-[#1a0a2e] border border-red-500/20 rounded-lg text-white"
                  >
                    {tiers.map((tier) => (
                      <option key={tier.slug} value={tier.slug}>
                        {tier.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">File URL</label>
                <input
                  type="url"
                  value={formData.file_url}
                  onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
                  required
                  className="w-full px-4 py-2 bg-[#1a0a2e] border border-red-500/20 rounded-lg text-white"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Thumbnail URL (optional)</label>
                <input
                  type="url"
                  value={formData.thumbnail_url}
                  onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                  className="w-full px-4 py-2 bg-[#1a0a2e] border border-red-500/20 rounded-lg text-white"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Sort Order</label>
                <input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 bg-[#1a0a2e] border border-red-500/20 rounded-lg text-white"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading === "form"}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 disabled:opacity-50 transition-colors"
                >
                  {loading === "form" ? "Saving..." : "Save Asset"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {assets.map((asset) => (
          <div
            key={asset.id}
            className="bg-[#2c0046] border border-red-500/20 rounded-lg overflow-hidden"
          >
            {/* Thumbnail */}
            {(asset.thumbnail_url || asset.asset_type === "image") && (
              <div className="aspect-video bg-[#1a0a2e] flex items-center justify-center">
                {asset.thumbnail_url || asset.asset_type === "image" ? (
                  <img
                    src={asset.thumbnail_url || asset.file_url}
                    alt={asset.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-4xl">{assetTypeIcons[asset.asset_type]}</span>
                )}
              </div>
            )}

            {/* Details */}
            <div className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-white font-medium">{asset.name}</h3>
                  {asset.description && (
                    <p className="text-sm text-gray-400 mt-1 line-clamp-2">{asset.description}</p>
                  )}
                </div>
                <span className="text-2xl">{assetTypeIcons[asset.asset_type]}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-xs ${tierColors[asset.min_tier] || "text-gray-400 bg-gray-500/20"}`}>
                  {asset.min_tier.replace("_", " ")}
                </span>
                <span className="text-xs text-gray-500">Order: {asset.sort_order}</span>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-gray-700/50">
                <a
                  href={asset.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  View
                </a>
                <button
                  onClick={() => openEditForm(asset)}
                  className="px-3 py-1 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteAsset(asset.id)}
                  disabled={loading === asset.id}
                  className="px-3 py-1 text-sm text-red-400 hover:text-red-300 disabled:opacity-50 transition-colors"
                >
                  {loading === asset.id ? "..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        ))}
        {assets.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500">
            No marketing assets yet. Click &quot;Add New Asset&quot; to create one.
          </div>
        )}
      </div>
    </div>
  );
}
