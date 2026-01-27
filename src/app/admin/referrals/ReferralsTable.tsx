"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Referral } from "@/lib/database.types";

interface ReferralWithAffiliate extends Referral {
  affiliates: {
    email: string;
    first_name: string | null;
    last_name: string | null;
    referral_code: string;
  } | null;
}

interface ReferralsTableProps {
  referrals: ReferralWithAffiliate[];
}

export function ReferralsTable({ referrals }: ReferralsTableProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  async function updateStatus(referralId: string, status: string) {
    setLoading(referralId);
    try {
      const res = await fetch("/api/admin/referrals/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referralId, status }),
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
      const res = await fetch("/api/admin/referrals/bulk-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referralIds: Array.from(selectedIds), status }),
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
    if (selectedIds.size === referrals.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(referrals.map((r) => r.id)));
    }
  }

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    approved: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    paid: "bg-green-500/20 text-green-400 border-green-500/30",
    refunded: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    rejected: "bg-red-500/20 text-red-400 border-red-500/30",
  };

  return (
    <div className="space-y-4">
      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="bg-[#2c0046] border border-red-500/20 rounded-lg p-4 flex items-center justify-between">
          <p className="text-gray-300">
            <span className="text-white font-medium">{selectedIds.size}</span> referral
            {selectedIds.size !== 1 ? "s" : ""} selected
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => bulkUpdateStatus("approved")}
              disabled={loading === "bulk"}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 transition-colors"
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
                  checked={selectedIds.size === referrals.length && referrals.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded bg-[#2c0046] border-red-500/30"
                />
              </th>
              <th className="p-4 text-left text-sm font-medium text-gray-400">Order</th>
              <th className="p-4 text-left text-sm font-medium text-gray-400">Affiliate</th>
              <th className="p-4 text-left text-sm font-medium text-gray-400">Source</th>
              <th className="p-4 text-left text-sm font-medium text-gray-400">Status</th>
              <th className="p-4 text-right text-sm font-medium text-gray-400">Order Total</th>
              <th className="p-4 text-right text-sm font-medium text-gray-400">Commission</th>
              <th className="p-4 text-left text-sm font-medium text-gray-400">Date</th>
              <th className="p-4 text-right text-sm font-medium text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {referrals.map((referral) => (
              <tr
                key={referral.id}
                className="border-b border-gray-700/50 hover:bg-[#1a0a2e]/50 transition-colors"
              >
                <td className="p-4">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(referral.id)}
                    onChange={() => toggleSelect(referral.id)}
                    className="w-4 h-4 rounded bg-[#2c0046] border-red-500/30"
                  />
                </td>
                <td className="p-4">
                  <div>
                    <p className="text-white font-medium">#{referral.order_number || referral.order_id}</p>
                    {referral.is_recurring && (
                      <span className="text-xs text-purple-400 bg-purple-500/20 px-2 py-0.5 rounded">
                        Recurring
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-4">
                  {referral.affiliates ? (
                    <div>
                      <p className="text-white">
                        {referral.affiliates.first_name} {referral.affiliates.last_name}
                      </p>
                      <p className="text-xs text-gray-400">{referral.affiliates.email}</p>
                      <code className="text-xs text-[#d4af37]">{referral.affiliates.referral_code}</code>
                    </div>
                  ) : (
                    <span className="text-gray-500">Unknown</span>
                  )}
                </td>
                <td className="p-4">
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      referral.order_source === "shopify"
                        ? "bg-green-500/20 text-green-400"
                        : "bg-blue-500/20 text-blue-400"
                    }`}
                  >
                    {referral.order_source}
                  </span>
                </td>
                <td className="p-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[referral.status]}`}
                  >
                    {referral.status}
                  </span>
                </td>
                <td className="p-4 text-right text-white">${referral.order_total.toFixed(2)}</td>
                <td className="p-4 text-right">
                  <div>
                    <p className="text-green-400 font-medium">${referral.commission_amount.toFixed(2)}</p>
                    <p className="text-xs text-gray-500">{(referral.commission_rate * 100).toFixed(0)}%</p>
                  </div>
                </td>
                <td className="p-4 text-sm text-gray-400">
                  {new Date(referral.order_date).toLocaleDateString()}
                </td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {referral.status === "pending" && (
                      <>
                        <button
                          onClick={() => updateStatus(referral.id, "approved")}
                          disabled={loading === referral.id}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-500 disabled:opacity-50 transition-colors"
                        >
                          {loading === referral.id ? "..." : "Approve"}
                        </button>
                        <button
                          onClick={() => updateStatus(referral.id, "rejected")}
                          disabled={loading === referral.id}
                          className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-500 disabled:opacity-50 transition-colors"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {referral.status === "approved" && (
                      <span className="text-xs text-gray-500">Ready for payout</span>
                    )}
                    {referral.status === "paid" && (
                      <span className="text-xs text-green-400">Paid out</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {referrals.length === 0 && (
              <tr>
                <td colSpan={9} className="p-8 text-center text-gray-500">
                  No referrals found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
