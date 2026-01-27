"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Affiliate } from "@/lib/database.types";

interface AffiliatesTableProps {
  affiliates: Affiliate[];
}

export function AffiliatesTable({ affiliates }: AffiliatesTableProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  async function updateStatus(affiliateId: string, status: string) {
    setLoading(affiliateId);
    try {
      const res = await fetch("/api/admin/affiliates/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ affiliateId, status }),
      });

      if (!res.ok) {
        throw new Error("Failed to update status");
      }

      router.refresh();
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status");
    } finally {
      setLoading(null);
    }
  }

  async function bulkUpdateStatus(status: string) {
    if (selectedIds.size === 0) return;

    setLoading("bulk");
    try {
      const res = await fetch("/api/admin/affiliates/bulk-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ affiliateIds: Array.from(selectedIds), status }),
      });

      if (!res.ok) {
        throw new Error("Failed to update statuses");
      }

      setSelectedIds(new Set());
      router.refresh();
    } catch (error) {
      console.error("Error updating statuses:", error);
      alert("Failed to update statuses");
    } finally {
      setLoading(null);
    }
  }

  function toggleSelect(id: string) {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  }

  function toggleSelectAll() {
    if (selectedIds.size === affiliates.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(affiliates.map((a) => a.id)));
    }
  }

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    approved: "bg-green-500/20 text-green-400 border-green-500/30",
    rejected: "bg-red-500/20 text-red-400 border-red-500/30",
    inactive: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  };

  const tierColors: Record<string, string> = {
    initiate: "text-gray-400",
    adept: "text-blue-400",
    inner_circle: "text-purple-400",
  };

  return (
    <div className="space-y-4">
      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="bg-[#2c0046] border border-red-500/20 rounded-lg p-4 flex items-center justify-between">
          <p className="text-gray-300">
            <span className="text-white font-medium">{selectedIds.size}</span> affiliate
            {selectedIds.size !== 1 ? "s" : ""} selected
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => bulkUpdateStatus("approved")}
              disabled={loading === "bulk"}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 disabled:opacity-50 transition-colors"
            >
              Approve All
            </button>
            <button
              onClick={() => bulkUpdateStatus("rejected")}
              disabled={loading === "bulk"}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 disabled:opacity-50 transition-colors"
            >
              Reject All
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-[#2c0046] border border-red-500/20 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#1a0a2e] border-b border-red-500/20">
            <tr>
              <th className="p-4 text-left">
                <input
                  type="checkbox"
                  checked={selectedIds.size === affiliates.length && affiliates.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded bg-[#2c0046] border-red-500/30"
                />
              </th>
              <th className="p-4 text-left text-sm font-medium text-gray-400">Affiliate</th>
              <th className="p-4 text-left text-sm font-medium text-gray-400">Status</th>
              <th className="p-4 text-left text-sm font-medium text-gray-400">Tier</th>
              <th className="p-4 text-left text-sm font-medium text-gray-400">Code</th>
              <th className="p-4 text-right text-sm font-medium text-gray-400">Referrals</th>
              <th className="p-4 text-right text-sm font-medium text-gray-400">Revenue</th>
              <th className="p-4 text-right text-sm font-medium text-gray-400">Balance</th>
              <th className="p-4 text-right text-sm font-medium text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {affiliates.map((affiliate) => (
              <tr
                key={affiliate.id}
                className="border-b border-gray-700/50 hover:bg-[#1a0a2e]/50 transition-colors"
              >
                <td className="p-4">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(affiliate.id)}
                    onChange={() => toggleSelect(affiliate.id)}
                    className="w-4 h-4 rounded bg-[#2c0046] border-red-500/30"
                  />
                </td>
                <td className="p-4">
                  <div>
                    <p className="text-white font-medium">
                      {affiliate.first_name} {affiliate.last_name}
                    </p>
                    <p className="text-sm text-gray-400">{affiliate.email}</p>
                    <p className="text-xs text-gray-500">
                      Joined {new Date(affiliate.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </td>
                <td className="p-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[affiliate.status]}`}
                  >
                    {affiliate.status}
                  </span>
                </td>
                <td className="p-4">
                  <span className={`capitalize ${tierColors[affiliate.tier] || "text-gray-400"}`}>
                    {affiliate.tier.replace("_", " ")}
                  </span>
                  <p className="text-xs text-gray-500">{(affiliate.commission_rate * 100).toFixed(0)}%</p>
                </td>
                <td className="p-4">
                  <code className="text-sm text-[#d4af37] bg-[#1a0a2e] px-2 py-1 rounded">
                    {affiliate.referral_code}
                  </code>
                </td>
                <td className="p-4 text-right text-white">{affiliate.total_referrals}</td>
                <td className="p-4 text-right text-white">${affiliate.total_revenue.toFixed(2)}</td>
                <td className="p-4 text-right">
                  <span className={affiliate.balance_owed >= 25 ? "text-green-400" : "text-white"}>
                    ${affiliate.balance_owed.toFixed(2)}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {affiliate.status === "pending" && (
                      <>
                        <button
                          onClick={() => updateStatus(affiliate.id, "approved")}
                          disabled={loading === affiliate.id}
                          className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-500 disabled:opacity-50 transition-colors"
                        >
                          {loading === affiliate.id ? "..." : "Approve"}
                        </button>
                        <button
                          onClick={() => updateStatus(affiliate.id, "rejected")}
                          disabled={loading === affiliate.id}
                          className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-500 disabled:opacity-50 transition-colors"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {affiliate.status === "approved" && (
                      <button
                        onClick={() => updateStatus(affiliate.id, "inactive")}
                        disabled={loading === affiliate.id}
                        className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-500 disabled:opacity-50 transition-colors"
                      >
                        Deactivate
                      </button>
                    )}
                    {affiliate.status === "inactive" && (
                      <button
                        onClick={() => updateStatus(affiliate.id, "approved")}
                        disabled={loading === affiliate.id}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-500 disabled:opacity-50 transition-colors"
                      >
                        Reactivate
                      </button>
                    )}
                    {affiliate.status === "rejected" && (
                      <button
                        onClick={() => updateStatus(affiliate.id, "approved")}
                        disabled={loading === affiliate.id}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-500 disabled:opacity-50 transition-colors"
                      >
                        Approve
                      </button>
                    )}
                    <a
                      href={`/admin/affiliates/${affiliate.id}`}
                      className="px-3 py-1 text-gray-400 hover:text-white text-sm transition-colors"
                    >
                      View
                    </a>
                  </div>
                </td>
              </tr>
            ))}
            {affiliates.length === 0 && (
              <tr>
                <td colSpan={9} className="p-8 text-center text-gray-500">
                  No affiliates found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
