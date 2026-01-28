"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface SystemError {
  id: string;
  error_type: string;
  severity: string;
  message: string;
  stack_trace?: string;
  source: string;
  endpoint?: string;
  affiliate_id?: string;
  order_id?: string;
  payout_id?: string;
  request_payload?: Record<string, unknown>;
  response_payload?: Record<string, unknown>;
  http_status?: number;
  details?: Record<string, unknown>;
  resolved: boolean;
  resolved_at?: string;
  resolved_by?: string;
  resolution_notes?: string;
  created_at: string;
  affiliates?: {
    email: string;
    first_name?: string;
    last_name?: string;
  };
}

interface ErrorsTableProps {
  errors: SystemError[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
  filters: {
    severity?: string;
    source?: string;
    resolved?: string;
  };
}

const severityColors: Record<string, string> = {
  critical: "bg-red-500/20 text-red-400 border-red-500/40",
  error: "bg-orange-500/20 text-orange-400 border-orange-500/40",
  warning: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
  info: "bg-blue-500/20 text-blue-400 border-blue-500/40",
};

const severityIcons: Record<string, string> = {
  critical: "🚨",
  error: "❌",
  warning: "⚠️",
  info: "ℹ️",
};

export function ErrorsTable({
  errors,
  currentPage,
  totalPages,
  totalCount,
  filters,
}: ErrorsTableProps) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [resolving, setResolving] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");

  const buildUrl = (page: number) => {
    const params = new URLSearchParams();
    if (filters.severity) params.set("severity", filters.severity);
    if (filters.source) params.set("source", filters.source);
    if (filters.resolved) params.set("resolved", filters.resolved);
    params.set("page", page.toString());
    return `/admin/errors?${params.toString()}`;
  };

  const handleResolve = async (errorId: string) => {
    try {
      const response = await fetch("/api/admin/errors/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          errorId,
          notes: resolutionNotes,
        }),
      });

      if (response.ok) {
        setResolving(null);
        setResolutionNotes("");
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to resolve error:", error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Results count */}
      <p className="text-sm text-gray-400">
        Showing {errors.length} of {totalCount} errors
      </p>

      {/* Errors List */}
      <div className="bg-[#2c0046] border border-red-500/20 rounded-lg overflow-hidden">
        {errors.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No errors found
          </div>
        ) : (
          <div className="divide-y divide-gray-700/50">
            {errors.map((error) => (
              <div key={error.id} className="p-4">
                {/* Error Header */}
                <div
                  className="flex items-start gap-4 cursor-pointer"
                  onClick={() =>
                    setExpandedId(expandedId === error.id ? null : error.id)
                  }
                >
                  <span className="text-2xl mt-1">
                    {severityIcons[error.severity] || "📝"}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded border ${
                          severityColors[error.severity] ||
                          "bg-gray-500/20 text-gray-400"
                        }`}
                      >
                        {error.severity.toUpperCase()}
                      </span>
                      <span className="px-2 py-0.5 text-xs font-medium rounded bg-purple-500/20 text-purple-400 border border-purple-500/40">
                        {error.source.replace(/_/g, " ")}
                      </span>
                      <span className="px-2 py-0.5 text-xs font-medium rounded bg-gray-500/20 text-gray-400 border border-gray-500/40">
                        {error.error_type.replace(/_/g, " ")}
                      </span>
                      {error.resolved && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded bg-green-500/20 text-green-400 border border-green-500/40">
                          RESOLVED
                        </span>
                      )}
                    </div>

                    <p className="text-white font-medium mt-2 break-words">
                      {error.message}
                    </p>

                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                      <span>
                        {new Date(error.created_at).toLocaleString()}
                      </span>
                      {error.affiliates && (
                        <span>
                          Affiliate: {error.affiliates.first_name}{" "}
                          {error.affiliates.last_name} ({error.affiliates.email})
                        </span>
                      )}
                      {error.order_id && <span>Order: {error.order_id}</span>}
                      {error.http_status && (
                        <span>HTTP {error.http_status}</span>
                      )}
                    </div>
                  </div>

                  <button className="text-gray-400 hover:text-white transition-colors">
                    {expandedId === error.id ? "▼" : "▶"}
                  </button>
                </div>

                {/* Expanded Details */}
                {expandedId === error.id && (
                  <div className="mt-4 pl-12 space-y-4">
                    {error.endpoint && (
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                          Endpoint
                        </p>
                        <p className="text-sm text-gray-300 font-mono">
                          {error.endpoint}
                        </p>
                      </div>
                    )}

                    {error.stack_trace && (
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                          Stack Trace
                        </p>
                        <pre className="text-xs text-gray-400 bg-[#1a0a2e] p-3 rounded overflow-auto max-h-48 font-mono">
                          {error.stack_trace}
                        </pre>
                      </div>
                    )}

                    {error.request_payload && (
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                          Request Payload
                        </p>
                        <pre className="text-xs text-gray-400 bg-[#1a0a2e] p-3 rounded overflow-auto max-h-32 font-mono">
                          {JSON.stringify(error.request_payload, null, 2)}
                        </pre>
                      </div>
                    )}

                    {error.response_payload && (
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                          Response Payload
                        </p>
                        <pre className="text-xs text-gray-400 bg-[#1a0a2e] p-3 rounded overflow-auto max-h-32 font-mono">
                          {JSON.stringify(error.response_payload, null, 2)}
                        </pre>
                      </div>
                    )}

                    {error.details && (
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                          Additional Details
                        </p>
                        <pre className="text-xs text-gray-400 bg-[#1a0a2e] p-3 rounded overflow-auto max-h-32 font-mono">
                          {JSON.stringify(error.details, null, 2)}
                        </pre>
                      </div>
                    )}

                    {error.resolved && error.resolution_notes && (
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                          Resolution Notes
                        </p>
                        <p className="text-sm text-green-400">
                          {error.resolution_notes}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Resolved at {new Date(error.resolved_at!).toLocaleString()}
                        </p>
                      </div>
                    )}

                    {/* Resolution Form */}
                    {!error.resolved && (
                      <div className="border-t border-gray-700/50 pt-4">
                        {resolving === error.id ? (
                          <div className="space-y-3">
                            <textarea
                              value={resolutionNotes}
                              onChange={(e) => setResolutionNotes(e.target.value)}
                              placeholder="Resolution notes (optional)"
                              className="w-full px-3 py-2 bg-[#1a0a2e] border border-red-500/20 rounded-lg text-white placeholder-gray-500 text-sm"
                              rows={2}
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleResolve(error.id)}
                                className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm transition-colors"
                              >
                                Confirm Resolve
                              </button>
                              <button
                                onClick={() => {
                                  setResolving(null);
                                  setResolutionNotes("");
                                }}
                                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-sm transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setResolving(error.id)}
                            className="px-4 py-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-500/40 rounded-lg text-sm transition-colors"
                          >
                            Mark as Resolved
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {currentPage > 1 && (
            <a
              href={buildUrl(currentPage - 1)}
              className="px-4 py-2 bg-[#2c0046] border border-red-500/20 rounded-lg text-gray-400 hover:text-white transition-colors"
            >
              Previous
            </a>
          )}
          <span className="px-4 py-2 text-gray-400">
            Page {currentPage} of {totalPages}
          </span>
          {currentPage < totalPages && (
            <a
              href={buildUrl(currentPage + 1)}
              className="px-4 py-2 bg-[#2c0046] border border-red-500/20 rounded-lg text-gray-400 hover:text-white transition-colors"
            >
              Next
            </a>
          )}
        </div>
      )}
    </div>
  );
}
