"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";

const navItems = [
  { href: "/admin", label: "Overview", icon: "📊" },
  { href: "/admin/affiliates", label: "Affiliates", icon: "👥" },
  { href: "/admin/referrals", label: "Referrals", icon: "🔗" },
  { href: "/admin/payouts", label: "Payouts", icon: "💰" },
  { href: "/admin/assets", label: "Assets", icon: "📁" },
  { href: "/admin/tiers", label: "Tiers", icon: "🏆" },
  { href: "/admin/activity", label: "Activity Log", icon: "📋" },
  { href: "/admin/errors", label: "Error Monitor", icon: "🚨" },
  { href: "/admin/docs", label: "Documentation", icon: "📖" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="w-64 min-h-screen bg-[#1a0a2e] border-r border-red-500/20 p-4 flex flex-col">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-red-500">Admin Portal</h1>
        <p className="text-sm text-gray-400">Everlore Hollow</p>
      </div>

      <ul className="space-y-2 flex-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/admin" && pathname.startsWith(item.href));
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? "bg-red-500/20 text-red-400 border border-red-500/30"
                    : "text-gray-300 hover:bg-red-500/10 hover:text-red-400"
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="border-t border-red-500/20 pt-4 mt-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-[#d4af37]/10 hover:text-[#d4af37] transition-colors mb-4"
        >
          <span>←</span>
          <span>Back to Affiliate Portal</span>
        </Link>

        <div className="flex items-center gap-3 px-4 py-3 bg-[#2c0046] rounded-lg border border-red-500/20">
          <UserButton
            appearance={{
              elements: {
                avatarBox: "w-10 h-10",
              },
            }}
          />
          <span className="text-sm text-gray-300">Admin</span>
        </div>
      </div>
    </nav>
  );
}
