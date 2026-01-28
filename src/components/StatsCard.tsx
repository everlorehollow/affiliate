"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  className?: string;
}

export function StatsCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendValue,
  className,
}: StatsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, boxShadow: "0 0 30px rgba(212, 175, 55, 0.15)" }}
      transition={{ duration: 0.3 }}
      className={cn(
        "relative overflow-hidden rounded-xl border border-[#d4af37]/20 bg-[#1a0a2e]/80 p-6 backdrop-blur-sm transition-all",
        "hover:border-[#d4af37]/40",
        className
      )}
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#d4af37]/5 via-transparent to-[#9d7cd8]/5 pointer-events-none" />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm font-heading text-[#9d7cd8] tracking-wide uppercase">
            {title}
          </p>
          <motion.p
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="mt-2 text-3xl font-heading font-bold text-[#d4af37] text-glow-gold"
          >
            {value}
          </motion.p>
          {subtitle && (
            <p className="mt-1 text-sm text-[#9d7cd8]/70">{subtitle}</p>
          )}
          {trend && trendValue && (
            <div className="mt-2 flex items-center gap-1">
              <span
                className={cn(
                  "text-sm font-medium",
                  trend === "up" && "text-emerald-400",
                  trend === "down" && "text-red-400",
                  trend === "neutral" && "text-[#9d7cd8]"
                )}
              >
                {trend === "up" && "↑"}
                {trend === "down" && "↓"}
                {trendValue}
              </span>
            </div>
          )}
        </div>
        {icon && (
          <motion.span
            initial={{ rotate: -10, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-3xl"
          >
            {icon}
          </motion.span>
        )}
      </div>
    </motion.div>
  );
}
