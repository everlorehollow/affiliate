"use client";

import { useState } from "react";

export function KlaviyoTestButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success?: boolean;
    message?: string;
    error?: string;
    results?: Record<string, { success: boolean; error?: string }>;
  } | null>(null);
  const [email, setEmail] = useState("");

  const triggerTest = async (event: string) => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/admin/test-klaviyo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event,
          email: email || undefined,
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Request failed",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-gray-400 mb-2">
          Test Email (optional - defaults to test@everlore.com)
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your-email@example.com"
          className="w-full max-w-md px-4 py-2 bg-black/40 border border-red-500/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => triggerTest("all")}
          disabled={loading}
          className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 text-white rounded-lg font-medium transition-colors"
        >
          {loading ? "Sending..." : "Send All Test Events"}
        </button>

        <button
          onClick={() => triggerTest("signup")}
          disabled={loading}
          className="px-4 py-2 bg-[#2c0046] hover:bg-[#3c0060] border border-red-500/20 text-gray-300 rounded-lg font-medium transition-colors"
        >
          Test Signup
        </button>

        <button
          onClick={() => triggerTest("approved")}
          disabled={loading}
          className="px-4 py-2 bg-[#2c0046] hover:bg-[#3c0060] border border-red-500/20 text-gray-300 rounded-lg font-medium transition-colors"
        >
          Test Approved
        </button>

        <button
          onClick={() => triggerTest("referral")}
          disabled={loading}
          className="px-4 py-2 bg-[#2c0046] hover:bg-[#3c0060] border border-red-500/20 text-gray-300 rounded-lg font-medium transition-colors"
        >
          Test Referral
        </button>

        <button
          onClick={() => triggerTest("tier_upgrade")}
          disabled={loading}
          className="px-4 py-2 bg-[#2c0046] hover:bg-[#3c0060] border border-red-500/20 text-gray-300 rounded-lg font-medium transition-colors"
        >
          Test Tier Upgrade
        </button>

        <button
          onClick={() => triggerTest("payout")}
          disabled={loading}
          className="px-4 py-2 bg-[#2c0046] hover:bg-[#3c0060] border border-red-500/20 text-gray-300 rounded-lg font-medium transition-colors"
        >
          Test Payout
        </button>
      </div>

      {result && (
        <div
          className={`p-4 rounded-lg ${
            result.success
              ? "bg-green-500/20 border border-green-500/30"
              : "bg-red-500/20 border border-red-500/30"
          }`}
        >
          {result.success ? (
            <div className="space-y-2">
              <p className="text-green-400 font-medium">{result.message}</p>
              {result.results && (
                <div className="text-sm text-gray-300">
                  <p className="mb-1">Results:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {Object.entries(result.results).map(([key, value]) => (
                      <li key={key}>
                        <span className="font-mono">{key}</span>:{" "}
                        {value.success ? (
                          <span className="text-green-400">sent</span>
                        ) : (
                          <span className="text-red-400">
                            failed - {value.error}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p className="text-red-400">
              {result.error || result.message || "Failed to send test events"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
