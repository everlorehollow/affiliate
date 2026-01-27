"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Payout } from "@/lib/database.types";

interface PayoutWithAffiliate extends Payout {
  affiliates: {
    email: string;
    first_name: string | null;
    last_name: string | null;
    referral_code: string;
    paypal_email: string | null;
  } | null;
}

interface PayoutsTableProps {
  payouts: PayoutWithAffiliate[];
}

export function PayoutsTable({ payouts }: PayoutsTableProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function updateStatus(payoutId: string, status: string) {
    setLoading(payoutId);
    try {
      const res = await fetch("/api/admin/payouts/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payoutId, status }),
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

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    processing: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    completed: "bg-green-500/20 text-green-400 border-green-500/30",
    failed: "bg-red-500/20 text-red-400 border-red-500/30",
  };

  const methodIcons: Record<string, string> = {
    paypal: "💳",
    manual: "✋",
    store_credit: "🏷️",
  };

  return (
    <div className="bg-[#2c0046] border border-red-500/20 rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-[#1a0a2e] border-b border-red-500/20">
          <tr>
            <th className="p-4 text-left text-sm font-medium text-gray-400">Payout ID</th>
            <th className="p-4 text-left text-sm font-medium text-gray-400">Affiliate</th>
            <th className="p-4 text-left text-sm font-medium text-gray-400">Method</th>
            <th className="p-4 text-right text-sm font-medium text-gray-400">Amount</th>
            <th className="p-4 text-left text-sm font-medium text-gray-400">Status</th>
            <th className="p-4 text-left text-sm font-medium text-gray-400">Created</th>
            <th className="p-4 text-right text-sm font-medium text-gray-400">Actions</th>
          </tr>
        </thead>
        <tbody>
          {payouts.map((payout) => (
            <tr
              key={payout.id}
              className="border-b border-gray-700/50 hover:bg-[#1a0a2e]/50 transition-colors"
            >
              <td className="p-4">
                <code className="text-sm text-gray-400">{payout.id.slice(0, 8)}...</code>
              </td>
              <td className="p-4">
                {payout.affiliates ? (
                  <div>
                    <p className="text-white">
                      {payout.affiliates.first_name} {payout.affiliates.last_name}
                    </p>
                    <p className="text-xs text-gray-400">{payout.affiliates.email}</p>
                    {payout.paypal_email && (
                      <p className="text-xs text-blue-400">PayPal: {payout.paypal_email}</p>
                    )}
                  </div>
                ) : (
                  <span className="text-gray-500">Unknown</span>
                )}
              </td>
              <td className="p-4">
                <span className="flex items-center gap-2 text-white">
                  <span>{methodIcons[payout.method] || "💰"}</span>
                  <span className="capitalize">{payout.method.replace("_", " ")}</span>
                </span>
              </td>
              <td className="p-4 text-right">
                <span className="text-green-400 font-bold">${payout.amount.toFixed(2)}</span>
              </td>
              <td className="p-4">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[payout.status]}`}
                >
                  {payout.status}
                </span>
                {payout.failure_reason && (
                  <p className="text-xs text-red-400 mt-1">{payout.failure_reason}</p>
                )}
              </td>
              <td className="p-4 text-sm text-gray-400">
                <div>
                  <p>{new Date(payout.created_at).toLocaleDateString()}</p>
                  {payout.completed_at && (
                    <p className="text-xs text-green-400">
                      Completed: {new Date(payout.completed_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </td>
              <td className="p-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  {payout.status === "pending" && (
                    <>
                      <button
                        onClick={() => updateStatus(payout.id, "processing")}
                        disabled={loading === payout.id}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-500 disabled:opacity-50 transition-colors"
                      >
                        {loading === payout.id ? "..." : "Process"}
                      </button>
                      <button
                        onClick={() => updateStatus(payout.id, "failed")}
                        disabled={loading === payout.id}
                        className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-500 disabled:opacity-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                  {payout.status === "processing" && (
                    <>
                      <button
                        onClick={() => updateStatus(payout.id, "completed")}
                        disabled={loading === payout.id}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-500 disabled:opacity-50 transition-colors"
                      >
                        {loading === payout.id ? "..." : "Complete"}
                      </button>
                      <button
                        onClick={() => updateStatus(payout.id, "failed")}
                        disabled={loading === payout.id}
                        className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-500 disabled:opacity-50 transition-colors"
                      >
                        Failed
                      </button>
                    </>
                  )}
                  {payout.status === "completed" && (
                    <span className="text-xs text-green-400">Paid</span>
                  )}
                  {payout.status === "failed" && (
                    <button
                      onClick={() => updateStatus(payout.id, "pending")}
                      disabled={loading === payout.id}
                      className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-500 disabled:opacity-50 transition-colors"
                    >
                      Retry
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
          {payouts.length === 0 && (
            <tr>
              <td colSpan={7} className="p-8 text-center text-gray-500">
                No payouts found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
