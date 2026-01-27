"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Tier } from "@/lib/database.types";

interface TiersManagerProps {
  tiers: Tier[];
  tierCounts: Record<string, number>;
}

export function TiersManager({ tiers, tierCounts }: TiersManagerProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [editingTier, setEditingTier] = useState<Tier | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    min_referrals: 0,
    commission_rate: 0.1,
    perks: [""],
  });

  function openEditForm(tier: Tier) {
    setEditingTier(tier);
    setFormData({
      name: tier.name,
      description: tier.description || "",
      min_referrals: tier.min_referrals,
      commission_rate: tier.commission_rate,
      perks: tier.perks || [""],
    });
  }

  function addPerk() {
    setFormData({ ...formData, perks: [...formData.perks, ""] });
  }

  function updatePerk(index: number, value: string) {
    const newPerks = [...formData.perks];
    newPerks[index] = value;
    setFormData({ ...formData, perks: newPerks });
  }

  function removePerk(index: number) {
    const newPerks = formData.perks.filter((_, i) => i !== index);
    setFormData({ ...formData, perks: newPerks.length ? newPerks : [""] });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingTier) return;

    setLoading(editingTier.id);
    try {
      const res = await fetch("/api/admin/tiers/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingTier.id,
          ...formData,
          perks: formData.perks.filter((p) => p.trim()),
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to update tier");
      }

      setEditingTier(null);
      router.refresh();
    } catch (error) {
      console.error("Error updating tier:", error);
      alert("Failed to update tier");
    } finally {
      setLoading(null);
    }
  }

  const tierColors: Record<string, string> = {
    initiate: "border-gray-500/30 bg-gray-500/10",
    adept: "border-blue-500/30 bg-blue-500/10",
    inner_circle: "border-purple-500/30 bg-purple-500/10",
  };

  const tierTextColors: Record<string, string> = {
    initiate: "text-gray-400",
    adept: "text-blue-400",
    inner_circle: "text-purple-400",
  };

  return (
    <div className="space-y-6">
      {/* Tiers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tiers.map((tier) => (
          <div
            key={tier.id}
            className={`border rounded-lg p-6 ${tierColors[tier.slug] || "border-gray-500/30"}`}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className={`text-xl font-bold ${tierTextColors[tier.slug] || "text-white"}`}>
                  {tier.name}
                </h3>
                <p className="text-sm text-gray-500 mt-1">{tier.description}</p>
              </div>
              <span className="text-2xl">
                {tier.slug === "initiate" && "🌱"}
                {tier.slug === "adept" && "⭐"}
                {tier.slug === "inner_circle" && "👑"}
              </span>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Commission Rate</span>
                <span className="text-white font-bold">{(tier.commission_rate * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Min Referrals</span>
                <span className="text-white">{tier.min_referrals}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Active Affiliates</span>
                <span className="text-white">{tierCounts[tier.slug] || 0}</span>
              </div>
            </div>

            {tier.perks && tier.perks.length > 0 && (
              <div className="border-t border-gray-700/50 pt-4 mb-4">
                <p className="text-xs text-gray-500 mb-2">Perks:</p>
                <ul className="space-y-1">
                  {tier.perks.map((perk, i) => (
                    <li key={i} className="text-sm text-gray-300 flex items-center gap-2">
                      <span className={tierTextColors[tier.slug] || "text-gray-400"}>✦</span>
                      {perk}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button
              onClick={() => openEditForm(tier)}
              className="w-full px-4 py-2 text-sm text-gray-400 hover:text-white border border-gray-700/50 rounded-lg hover:border-gray-600 transition-colors"
            >
              Edit Tier
            </button>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {editingTier && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#2c0046] border border-red-500/20 rounded-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold text-red-400 mb-4">
              Edit {editingTier.name} Tier
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
                  rows={2}
                  className="w-full px-4 py-2 bg-[#1a0a2e] border border-red-500/20 rounded-lg text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Min Referrals</label>
                  <input
                    type="number"
                    value={formData.min_referrals}
                    onChange={(e) => setFormData({ ...formData, min_referrals: parseInt(e.target.value) || 0 })}
                    min={0}
                    className="w-full px-4 py-2 bg-[#1a0a2e] border border-red-500/20 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Commission Rate (%)</label>
                  <input
                    type="number"
                    value={(formData.commission_rate * 100).toFixed(0)}
                    onChange={(e) => setFormData({ ...formData, commission_rate: (parseFloat(e.target.value) || 0) / 100 })}
                    min={0}
                    max={100}
                    step={1}
                    className="w-full px-4 py-2 bg-[#1a0a2e] border border-red-500/20 rounded-lg text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Perks</label>
                <div className="space-y-2">
                  {formData.perks.map((perk, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={perk}
                        onChange={(e) => updatePerk(index, e.target.value)}
                        placeholder="Enter perk..."
                        className="flex-1 px-4 py-2 bg-[#1a0a2e] border border-red-500/20 rounded-lg text-white"
                      />
                      {formData.perks.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePerk(index)}
                          className="px-3 py-2 text-red-400 hover:text-red-300 transition-colors"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addPerk}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    + Add Perk
                  </button>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingTier(null)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading === editingTier.id}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 disabled:opacity-50 transition-colors"
                >
                  {loading === editingTier.id ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
