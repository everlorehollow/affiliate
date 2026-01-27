"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface EligibleAffiliate {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  balance_owed: number;
  paypal_email: string | null;
}

interface CreatePayoutFormProps {
  affiliates: EligibleAffiliate[];
}

export function CreatePayoutForm({ affiliates }: CreatePayoutFormProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [method, setMethod] = useState<"paypal" | "manual">("manual");

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

  const selectedAffiliates = affiliates.filter((a) => selectedIds.has(a.id));
  const totalAmount = selectedAffiliates.reduce((sum, a) => sum + a.balance_owed, 0);

  async function createPayouts() {
    if (selectedIds.size === 0) return;

    setLoading(true);
    try {
      const res = await fetch("/api/admin/payouts/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          affiliateIds: Array.from(selectedIds),
          method,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create payouts");
      }

      setSelectedIds(new Set());
      router.refresh();
    } catch (error) {
      console.error("Error creating payouts:", error);
      alert(error instanceof Error ? error.message : "Failed to create payouts");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Method Selection */}
      <div className="flex items-center gap-4">
        <label className="text-sm text-gray-400">Payout Method:</label>
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value as "paypal" | "manual")}
          className="px-4 py-2 bg-[#1a0a2e] border border-red-500/20 rounded-lg text-white"
        >
          <option value="manual">Manual (record only)</option>
          <option value="paypal">PayPal</option>
        </select>
      </div>

      {/* Affiliate Selection Table */}
      <div className="bg-[#1a0a2e] border border-gray-700/50 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-gray-700/50">
            <tr>
              <th className="p-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedIds.size === affiliates.length && affiliates.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded bg-[#2c0046] border-red-500/30"
                />
              </th>
              <th className="p-3 text-left text-sm font-medium text-gray-400">Affiliate</th>
              <th className="p-3 text-left text-sm font-medium text-gray-400">PayPal</th>
              <th className="p-3 text-right text-sm font-medium text-gray-400">Balance</th>
            </tr>
          </thead>
          <tbody>
            {affiliates.map((affiliate) => (
              <tr
                key={affiliate.id}
                className="border-b border-gray-700/30 hover:bg-[#2c0046]/30 cursor-pointer"
                onClick={() => toggleSelect(affiliate.id)}
              >
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(affiliate.id)}
                    onChange={() => toggleSelect(affiliate.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 rounded bg-[#2c0046] border-red-500/30"
                  />
                </td>
                <td className="p-3">
                  <p className="text-white">
                    {affiliate.first_name} {affiliate.last_name}
                  </p>
                  <p className="text-xs text-gray-400">{affiliate.email}</p>
                </td>
                <td className="p-3">
                  {affiliate.paypal_email ? (
                    <span className="text-blue-400 text-sm">{affiliate.paypal_email}</span>
                  ) : (
                    <span className="text-red-400 text-sm">Not set</span>
                  )}
                </td>
                <td className="p-3 text-right">
                  <span className="text-green-400 font-bold">${affiliate.balance_owed.toFixed(2)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary and Actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between bg-green-500/10 border border-green-500/30 rounded-lg p-4">
          <div>
            <p className="text-white font-medium">
              {selectedIds.size} affiliate{selectedIds.size !== 1 ? "s" : ""} selected
            </p>
            <p className="text-2xl font-bold text-green-400">${totalAmount.toFixed(2)} total</p>
          </div>
          <button
            onClick={createPayouts}
            disabled={loading}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-500 disabled:opacity-50 transition-colors font-medium"
          >
            {loading ? "Creating..." : `Create ${selectedIds.size} Payout${selectedIds.size !== 1 ? "s" : ""}`}
          </button>
        </div>
      )}
    </div>
  );
}
