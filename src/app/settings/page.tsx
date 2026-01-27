"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useSupabase } from "@/hooks/useSupabase";
import type { Affiliate } from "@/lib/database.types";

export default function SettingsPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const supabase = useSupabase();
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    paypal_email: "",
    instagram_handle: "",
    tiktok_handle: "",
    youtube_channel: "",
    website_url: "",
    bio: "",
  });

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      router.push("/sign-in");
      return;
    }

    async function loadAffiliate() {
      if (!supabase || !user?.id) return;

      const { data } = await supabase
        .from("affiliates")
        .select("*")
        .eq("clerk_user_id", user.id)
        .single();

      if (data) {
        const affiliateData = data as Affiliate;
        setAffiliate(affiliateData);
        setFormData({
          paypal_email: affiliateData.paypal_email || "",
          instagram_handle: affiliateData.instagram_handle || "",
          tiktok_handle: affiliateData.tiktok_handle || "",
          youtube_channel: affiliateData.youtube_channel || "",
          website_url: affiliateData.website_url || "",
          bio: affiliateData.bio || "",
        });
      }
      setLoading(false);
    }

    loadAffiliate();
  }, [user, isLoaded, supabase, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !affiliate) return;

    setSaving(true);
    setMessage(null);

    const updateData: Partial<Affiliate> = {
      paypal_email: formData.paypal_email || null,
      instagram_handle: formData.instagram_handle || null,
      tiktok_handle: formData.tiktok_handle || null,
      youtube_channel: formData.youtube_channel || null,
      website_url: formData.website_url || null,
      bio: formData.bio || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("affiliates")
      .update(updateData as never)
      .eq("id", affiliate.id as never);

    setSaving(false);

    if (error) {
      setMessage({ type: "error", text: "Failed to save settings. Please try again." });
    } else {
      setMessage({ type: "success", text: "Settings saved successfully!" });
    }
  };

  if (!isLoaded || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-gray-400">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!affiliate) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-gray-400">Affiliate profile not found.</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-2xl">
        <div>
          <h1 className="text-3xl font-bold text-[#d4af37]">Settings</h1>
          <p className="text-gray-400 mt-1">Manage your affiliate profile</p>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`p-4 rounded-lg ${
              message.type === "success"
                ? "bg-green-500/20 text-green-300 border border-green-500/30"
                : "bg-red-500/20 text-red-300 border border-red-500/30"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Profile Info (Read-only) */}
        <div className="bg-[#2c0046] border border-[#d4af37]/20 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-[#d4af37] mb-4">Account Info</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-400">Email</p>
              <p className="text-white">{affiliate.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Referral Code</p>
              <p className="text-[#d4af37] font-mono">{affiliate.referral_code}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Status</p>
              <p className="text-white capitalize">{affiliate.status}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Tier</p>
              <p className="text-white capitalize">{affiliate.tier.replace("_", " ")}</p>
            </div>
          </div>
        </div>

        {/* Editable Settings */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-[#2c0046] border border-[#d4af37]/20 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-[#d4af37] mb-4">Payout Settings</h2>
            <div>
              <label className="block text-sm text-gray-400 mb-2">PayPal Email</label>
              <input
                type="email"
                value={formData.paypal_email}
                onChange={(e) => setFormData({ ...formData, paypal_email: e.target.value })}
                className="w-full px-4 py-3 bg-[#1a0a2e] border border-[#d4af37]/30 rounded-lg text-white focus:outline-none focus:border-[#d4af37]"
                placeholder="your@paypal.com"
              />
              <p className="text-xs text-gray-500 mt-2">
                This is where we&apos;ll send your commission payouts.
              </p>
            </div>
          </div>

          <div className="bg-[#2c0046] border border-[#d4af37]/20 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-[#d4af37] mb-4">Social Profiles</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Instagram Handle</label>
                <input
                  type="text"
                  value={formData.instagram_handle}
                  onChange={(e) => setFormData({ ...formData, instagram_handle: e.target.value })}
                  className="w-full px-4 py-3 bg-[#1a0a2e] border border-[#d4af37]/30 rounded-lg text-white focus:outline-none focus:border-[#d4af37]"
                  placeholder="@yourusername"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">TikTok Handle</label>
                <input
                  type="text"
                  value={formData.tiktok_handle}
                  onChange={(e) => setFormData({ ...formData, tiktok_handle: e.target.value })}
                  className="w-full px-4 py-3 bg-[#1a0a2e] border border-[#d4af37]/30 rounded-lg text-white focus:outline-none focus:border-[#d4af37]"
                  placeholder="@yourusername"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">YouTube Channel</label>
                <input
                  type="text"
                  value={formData.youtube_channel}
                  onChange={(e) => setFormData({ ...formData, youtube_channel: e.target.value })}
                  className="w-full px-4 py-3 bg-[#1a0a2e] border border-[#d4af37]/30 rounded-lg text-white focus:outline-none focus:border-[#d4af37]"
                  placeholder="https://youtube.com/@yourchannel"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Website URL</label>
                <input
                  type="url"
                  value={formData.website_url}
                  onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                  className="w-full px-4 py-3 bg-[#1a0a2e] border border-[#d4af37]/30 rounded-lg text-white focus:outline-none focus:border-[#d4af37]"
                  placeholder="https://yourwebsite.com"
                />
              </div>
            </div>
          </div>

          <div className="bg-[#2c0046] border border-[#d4af37]/20 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-[#d4af37] mb-4">Bio</h2>
            <div>
              <label className="block text-sm text-gray-400 mb-2">About You</label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                rows={4}
                className="w-full px-4 py-3 bg-[#1a0a2e] border border-[#d4af37]/30 rounded-lg text-white focus:outline-none focus:border-[#d4af37] resize-none"
                placeholder="Tell us about yourself and how you plan to promote Everlore Hollow..."
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full px-6 py-3 bg-[#d4af37] hover:bg-[#b8962e] disabled:bg-[#d4af37]/50 text-[#1a0a2e] font-semibold rounded-lg transition-colors"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
}
