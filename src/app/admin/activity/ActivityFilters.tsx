"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface ActivityFiltersProps {
  uniqueActions: string[];
  currentAction?: string;
}

export function ActivityFilters({ uniqueActions, currentAction }: ActivityFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleActionChange = (action: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (action) {
      params.set("action", action);
    } else {
      params.delete("action");
    }
    params.delete("page");
    router.push(`/admin/activity?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      <select
        value={currentAction || ""}
        onChange={(e) => handleActionChange(e.target.value)}
        className="px-4 py-2 bg-[#2c0046] border border-red-500/20 rounded-lg text-white"
      >
        <option value="">All Actions</option>
        {uniqueActions.map((action) => (
          <option key={action} value={action}>
            {action.replace(/_/g, " ")}
          </option>
        ))}
      </select>

      {currentAction && (
        <button
          onClick={() => handleActionChange("")}
          className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          Clear Filters
        </button>
      )}
    </div>
  );
}
