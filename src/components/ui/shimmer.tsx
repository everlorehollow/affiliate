"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ShimmerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Shimmer({ children, className, ...props }: ShimmerProps) {
  return (
    <div className={cn("relative overflow-hidden", className)} {...props}>
      {children}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-[#d4af37]/10 to-transparent" />
    </div>
  );
}

interface ShimmerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export function ShimmerButton({ children, className, ...props }: ShimmerButtonProps) {
  return (
    <button
      className={cn(
        "relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-lg bg-gradient-to-r from-[#d4af37] to-[#b8962e] px-6 py-3 font-heading text-sm font-medium text-[#1a0a2e] transition-all duration-300",
        "hover:shadow-[0_0_30px_rgba(212,175,55,0.5)]",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/25 before:to-transparent",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

// Add shimmer keyframes to globals.css or use inline style
export function ShimmerCard({ children, className, ...props }: ShimmerProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-[#d4af37]/20 bg-[#1a0a2e]/90 backdrop-blur-sm",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_3s_infinite] before:bg-gradient-to-r before:from-transparent before:via-[#d4af37]/5 before:to-transparent",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
