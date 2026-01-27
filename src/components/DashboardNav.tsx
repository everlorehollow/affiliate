"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/referrals", label: "Referrals", icon: "👥" },
  { href: "/payouts", label: "Payouts", icon: "💰" },
  { href: "/assets", label: "Assets", icon: "📁" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="w-64 min-h-screen bg-[#2c0046] border-r border-[#d4af37]/20 p-4">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-[#d4af37]">Everlore Hollow</h1>
        <p className="text-sm text-gray-400">Affiliate Portal</p>
      </div>

      <ul className="space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? "bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/30"
                    : "text-gray-300 hover:bg-[#d4af37]/10 hover:text-[#d4af37]"
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="absolute bottom-4 left-4 right-4">
        <div className="flex items-center gap-3 px-4 py-3 bg-[#1a0a2e] rounded-lg border border-[#d4af37]/20">
          <UserButton
            appearance={{
              elements: {
                avatarBox: "w-10 h-10",
              },
            }}
          />
          <span className="text-sm text-gray-300">Account</span>
        </div>
      </div>
    </nav>
  );
}
