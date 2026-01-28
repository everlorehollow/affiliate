"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

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
    <motion.nav
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="relative w-64 min-h-screen bg-[#0a0612]/95 backdrop-blur-xl border-r border-[#d4af37]/20 p-4 flex flex-col"
    >
      {/* Decorative gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#d4af37]/5 via-transparent to-[#9d7cd8]/5 pointer-events-none" />

      <div className="relative flex-1 flex flex-col">
        {/* Logo Section */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 px-2"
        >
          <h1 className="text-xl font-heading font-bold text-[#d4af37] text-glow-gold tracking-wider">
            Everlore Hollow
          </h1>
          <p className="text-sm text-[#9d7cd8] font-body mt-1">Affiliate Portal</p>
        </motion.div>

        {/* Divider */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-[#d4af37]/30 to-transparent mb-6" />

        {/* Navigation Items */}
        <ul className="space-y-1">
          {navItems.map((item, index) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <motion.li
                key={item.href}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + index * 0.05 }}
              >
                <Link
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-3 px-4 py-3 rounded-lg font-heading text-sm tracking-wide transition-all duration-300",
                    isActive
                      ? "bg-gradient-to-r from-[#d4af37]/20 to-[#d4af37]/10 text-[#d4af37] border border-[#d4af37]/30 shadow-[0_0_15px_rgba(212,175,55,0.1)]"
                      : "text-[#f5f5f5]/70 hover:bg-[#d4af37]/10 hover:text-[#d4af37] hover:border-[#d4af37]/20 border border-transparent"
                  )}
                >
                  <motion.span
                    whileHover={{ scale: 1.2, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 400 }}
                    className="text-lg"
                  >
                    {item.icon}
                  </motion.span>
                  <span>{item.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="ml-auto w-1.5 h-1.5 rounded-full bg-[#d4af37] shadow-[0_0_8px_rgba(212,175,55,0.8)]"
                    />
                  )}
                </Link>
              </motion.li>
            );
          })}
        </ul>

        {/* Spacer to push account to bottom */}
        <div className="flex-1" />

        {/* User Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-6"
        >
          <div className="flex items-center gap-3 px-4 py-3 bg-[#1a0a2e]/80 rounded-xl border border-[#d4af37]/20 backdrop-blur-sm hover:border-[#d4af37]/40 transition-all">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-10 h-10 ring-2 ring-[#d4af37]/30",
                },
              }}
            />
            <div>
              <span className="text-sm text-[#f5f5f5] font-heading">Account</span>
              <p className="text-xs text-[#9d7cd8]">Manage profile</p>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.nav>
  );
}
