"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Affiliate, Tier, Referral, Payout, ReferredCustomer, ActivityLog } from "@/lib/database.types";

interface AffiliateDetailProps {
  affiliate: Affiliate;
  tiers: Tier[];
  referrals: Referral[];
  payouts: Payout[];
  customers: ReferredCustomer[];
  customerCount: number;
  activity: ActivityLog[];
}

export function AffiliateDetail({
  affiliate,
  tiers,
  referrals,
  payouts,
  customers,
  customerCount,
  activity,
}: AffiliateDetailProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    first_name: affiliate.first_name || "",
    last_name: affiliate.last_name || "",
    email: affiliate.email,
    tier: affiliate.tier,
    commission_rate: affiliate.commission_rate,
    status: affiliate.status,
    paypal_email: affiliate.paypal_email || "",
    referral_code: affiliate.referral_code,
    discount_code: affiliate.discount_code || "",
    instagram_handle: affiliate.instagram_handle || "",
    tiktok_handle: affiliate.tiktok_handle || "",
    youtube_channel: affiliate.youtube_channel || "",
    website_url: affiliate.website_url || "",
    bio: affiliate.bio || "",
  });

  async function handleSave() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/affiliates/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: affiliate.id, ...formData }),
      });

      if (!res.ok) {
        throw new Error("Failed to update affiliate");
      }

      setEditing(false);
      router.refresh();
    } catch (error) {
      console.error("Error updating affiliate:", error);
      alert("Failed to update affiliate");
    } finally {
      setLoading(false);
    }
  }

  async function recalculateStats() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/affiliates/recalculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ affiliateId: affiliate.id }),
      });

      if (!res.ok) {
        throw new Error("Failed to recalculate stats");
      }

      router.refresh();
    } catch (error) {
      console.error("Error recalculating stats:", error);
      alert("Failed to recalculate stats");
    } finally {
      setLoading(false);
    }
  }

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    approved: "bg-green-500/20 text-green-400 border-green-500/30",
    rejected: "bg-red-500/20 text-red-400 border-red-500/30",
    inactive: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/admin/affiliates" className="text-sm text-gray-400 hover:text-white mb-2 inline-block">
            ← Back to Affiliates
          </Link>
          <h1 className="text-3xl font-bold text-red-500">
            {affiliate.first_name} {affiliate.last_name}
          </h1>
          <p className="text-gray-400">{affiliate.email}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[affiliate.status]}`}>
              {affiliate.status}
            </span>
            <span className="text-sm text-gray-500">
              Joined {new Date(affiliate.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={recalculateStats}
            disabled={loading}
            className="px-4 py-2 text-gray-400 hover:text-white border border-gray-700 rounded-lg transition-colors disabled:opacity-50"
          >
            Recalculate Stats
          </button>
          <button
            onClick={() => setEditing(!editing)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors"
          >
            {editing ? "Cancel" : "Edit"}
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#2c0046] border border-red-500/20 rounded-lg p-4">
          <p className="text-sm text-gray-400">Total Referrals</p>
          <p className="text-2xl font-bold text-white">{affiliate.total_referrals}</p>
        </div>
        <div className="bg-[#2c0046] border border-red-500/20 rounded-lg p-4">
          <p className="text-sm text-gray-400">Total Revenue</p>
          <p className="text-2xl font-bold text-white">${affiliate.total_revenue.toFixed(2)}</p>
        </div>
        <div className="bg-[#2c0046] border border-red-500/20 rounded-lg p-4">
          <p className="text-sm text-gray-400">Commission Earned</p>
          <p className="text-2xl font-bold text-green-400">${affiliate.total_commission_earned.toFixed(2)}</p>
        </div>
        <div className="bg-[#2c0046] border border-red-500/20 rounded-lg p-4">
          <p className="text-sm text-gray-400">Balance Owed</p>
          <p className="text-2xl font-bold text-yellow-400">${affiliate.balance_owed.toFixed(2)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Information */}
        <div className="bg-[#2c0046] border border-red-500/20 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-red-400 mb-4">Profile Information</h2>

          {editing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">First Name</label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full px-4 py-2 bg-[#1a0a2e] border border-red-500/20 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full px-4 py-2 bg-[#1a0a2e] border border-red-500/20 rounded-lg text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 bg-[#1a0a2e] border border-red-500/20 rounded-lg text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2 bg-[#1a0a2e] border border-red-500/20 rounded-lg text-white"
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Tier</label>
                  <select
                    value={formData.tier}
                    onChange={(e) => {
                      const tier = tiers.find((t) => t.slug === e.target.value);
                      setFormData({
                        ...formData,
                        tier: e.target.value,
                        commission_rate: tier?.commission_rate || formData.commission_rate,
                      });
                    }}
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Commission Rate (%)</label>
                  <input
                    type="number"
                    value={(formData.commission_rate * 100).toFixed(0)}
                    onChange={(e) => setFormData({ ...formData, commission_rate: (parseFloat(e.target.value) || 0) / 100 })}
                    min={0}
                    max={100}
                    className="w-full px-4 py-2 bg-[#1a0a2e] border border-red-500/20 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">PayPal Email</label>
                  <input
                    type="email"
                    value={formData.paypal_email}
                    onChange={(e) => setFormData({ ...formData, paypal_email: e.target.value })}
                    className="w-full px-4 py-2 bg-[#1a0a2e] border border-red-500/20 rounded-lg text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Referral Code</label>
                  <input
                    type="text"
                    value={formData.referral_code}
                    onChange={(e) => setFormData({ ...formData, referral_code: e.target.value })}
                    className="w-full px-4 py-2 bg-[#1a0a2e] border border-red-500/20 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Discount Code</label>
                  <input
                    type="text"
                    value={formData.discount_code}
                    onChange={(e) => setFormData({ ...formData, discount_code: e.target.value })}
                    className="w-full px-4 py-2 bg-[#1a0a2e] border border-red-500/20 rounded-lg text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Bio</label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 bg-[#1a0a2e] border border-red-500/20 rounded-lg text-white"
                />
              </div>
              <button
                onClick={handleSave}
                disabled={loading}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 disabled:opacity-50 transition-colors"
              >
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Tier</span>
                <span className="text-white capitalize">{affiliate.tier.replace("_", " ")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Commission Rate</span>
                <span className="text-white">{(affiliate.commission_rate * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Referral Code</span>
                <code className="text-[#d4af37]">{affiliate.referral_code}</code>
              </div>
              {affiliate.discount_code && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Discount Code</span>
                  <code className="text-[#d4af37]">{affiliate.discount_code}</code>
                </div>
              )}
              {affiliate.paypal_email && (
                <div className="flex justify-between">
                  <span className="text-gray-400">PayPal</span>
                  <span className="text-white">{affiliate.paypal_email}</span>
                </div>
              )}
              {affiliate.instagram_handle && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Instagram</span>
                  <span className="text-white">@{affiliate.instagram_handle}</span>
                </div>
              )}
              {affiliate.tiktok_handle && (
                <div className="flex justify-between">
                  <span className="text-gray-400">TikTok</span>
                  <span className="text-white">@{affiliate.tiktok_handle}</span>
                </div>
              )}
              {affiliate.youtube_channel && (
                <div className="flex justify-between">
                  <span className="text-gray-400">YouTube</span>
                  <span className="text-white">{affiliate.youtube_channel}</span>
                </div>
              )}
              {affiliate.website_url && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Website</span>
                  <a href={affiliate.website_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                    {affiliate.website_url}
                  </a>
                </div>
              )}
              {affiliate.bio && (
                <div className="pt-2 border-t border-gray-700/50">
                  <p className="text-gray-400 text-sm mb-1">Bio</p>
                  <p className="text-white text-sm">{affiliate.bio}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-[#2c0046] border border-red-500/20 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-red-400 mb-4">Recent Activity</h2>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {activity.map((log) => (
              <div key={log.id} className="flex items-start gap-3 py-2 border-b border-gray-700/30 last:border-0">
                <span className="text-lg">📝</span>
                <div className="flex-1">
                  <p className="text-white text-sm capitalize">{log.action.replace(/_/g, " ")}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(log.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
            {activity.length === 0 && (
              <p className="text-gray-500 text-sm">No recent activity</p>
            )}
          </div>
        </div>
      </div>

      {/* Referred Customers */}
      <div className="bg-[#2c0046] border border-red-500/20 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-red-400">
            Referred Customers ({customerCount})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-700/50">
              <tr>
                <th className="p-3 text-left text-sm font-medium text-gray-400">Email</th>
                <th className="p-3 text-left text-sm font-medium text-gray-400">First Order</th>
                <th className="p-3 text-right text-sm font-medium text-gray-400">Order Total</th>
                <th className="p-3 text-left text-sm font-medium text-gray-400">Date</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id} className="border-b border-gray-700/30">
                  <td className="p-3 text-white">{customer.email}</td>
                  <td className="p-3 text-gray-400">#{customer.first_order_id}</td>
                  <td className="p-3 text-right text-white">${(customer.first_order_total || 0).toFixed(2)}</td>
                  <td className="p-3 text-gray-400">
                    {customer.first_order_date ? new Date(customer.first_order_date).toLocaleDateString() : "N/A"}
                  </td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-gray-500">
                    No referred customers yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Referrals */}
      <div className="bg-[#2c0046] border border-red-500/20 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-red-400">Recent Referrals</h2>
          <Link href={`/admin/referrals?affiliate=${affiliate.id}`} className="text-sm text-gray-400 hover:text-white">
            View All →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-700/50">
              <tr>
                <th className="p-3 text-left text-sm font-medium text-gray-400">Order</th>
                <th className="p-3 text-left text-sm font-medium text-gray-400">Source</th>
                <th className="p-3 text-right text-sm font-medium text-gray-400">Total</th>
                <th className="p-3 text-right text-sm font-medium text-gray-400">Commission</th>
                <th className="p-3 text-left text-sm font-medium text-gray-400">Status</th>
                <th className="p-3 text-left text-sm font-medium text-gray-400">Date</th>
              </tr>
            </thead>
            <tbody>
              {referrals.map((referral) => (
                <tr key={referral.id} className="border-b border-gray-700/30">
                  <td className="p-3 text-white">#{referral.order_number || referral.order_id}</td>
                  <td className="p-3 text-gray-400 capitalize">{referral.order_source}</td>
                  <td className="p-3 text-right text-white">${referral.order_total.toFixed(2)}</td>
                  <td className="p-3 text-right text-green-400">${referral.commission_amount.toFixed(2)}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      referral.status === "paid" ? "bg-green-500/20 text-green-400" :
                      referral.status === "approved" ? "bg-blue-500/20 text-blue-400" :
                      referral.status === "pending" ? "bg-yellow-500/20 text-yellow-400" :
                      "bg-gray-500/20 text-gray-400"
                    }`}>
                      {referral.status}
                    </span>
                  </td>
                  <td className="p-3 text-gray-400">
                    {new Date(referral.order_date).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {referrals.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-gray-500">
                    No referrals yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Payouts */}
      <div className="bg-[#2c0046] border border-red-500/20 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-red-400">Recent Payouts</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-700/50">
              <tr>
                <th className="p-3 text-left text-sm font-medium text-gray-400">ID</th>
                <th className="p-3 text-right text-sm font-medium text-gray-400">Amount</th>
                <th className="p-3 text-left text-sm font-medium text-gray-400">Method</th>
                <th className="p-3 text-left text-sm font-medium text-gray-400">Status</th>
                <th className="p-3 text-left text-sm font-medium text-gray-400">Date</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((payout) => (
                <tr key={payout.id} className="border-b border-gray-700/30">
                  <td className="p-3 text-gray-400 font-mono text-sm">{payout.id.slice(0, 8)}...</td>
                  <td className="p-3 text-right text-green-400 font-bold">${payout.amount.toFixed(2)}</td>
                  <td className="p-3 text-white capitalize">{payout.method.replace("_", " ")}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      payout.status === "completed" ? "bg-green-500/20 text-green-400" :
                      payout.status === "processing" ? "bg-blue-500/20 text-blue-400" :
                      payout.status === "pending" ? "bg-yellow-500/20 text-yellow-400" :
                      "bg-red-500/20 text-red-400"
                    }`}>
                      {payout.status}
                    </span>
                  </td>
                  <td className="p-3 text-gray-400">
                    {new Date(payout.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {payouts.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-gray-500">
                    No payouts yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
