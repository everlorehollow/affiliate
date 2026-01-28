"use client";

import * as React from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlassPanelProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children: React.ReactNode;
  variant?: "default" | "dark" | "light" | "purple";
  blur?: "sm" | "md" | "lg" | "xl";
  border?: boolean;
  glow?: boolean;
  hoverable?: boolean;
  className?: string;
}

const variantStyles = {
  default: "bg-[#1a0a2e]/60",
  dark: "bg-[#0a0612]/70",
  light: "bg-[#2c0046]/50",
  purple: "bg-[#9d7cd8]/10",
};

const blurStyles = {
  sm: "backdrop-blur-sm",
  md: "backdrop-blur-md",
  lg: "backdrop-blur-lg",
  xl: "backdrop-blur-xl",
};

export function GlassPanel({
  children,
  variant = "default",
  blur = "lg",
  border = true,
  glow = false,
  hoverable = false,
  className,
  ...props
}: GlassPanelProps) {
  const baseStyles = cn(
    "rounded-2xl transition-all duration-300",
    variantStyles[variant],
    blurStyles[blur],
    border && "border border-[#d4af37]/20",
    glow && "shadow-[0_0_30px_rgba(212,175,55,0.1)]",
    hoverable && "hover:border-[#d4af37]/40 hover:shadow-[0_0_40px_rgba(212,175,55,0.15)]"
  );

  if (hoverable) {
    return (
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
        className={cn(baseStyles, className)}
        {...props}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div className={cn(baseStyles, className)} {...(props as React.HTMLAttributes<HTMLDivElement>)}>
      {children}
    </div>
  );
}

// Frosted glass card with inner glow
interface FrostedCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  innerGlow?: boolean;
}

export function FrostedCard({
  children,
  innerGlow = false,
  className,
  ...props
}: FrostedCardProps) {
  return (
    <div
      className={cn(
        "relative rounded-2xl bg-[#1a0a2e]/40 backdrop-blur-xl border border-[#d4af37]/20 overflow-hidden",
        className
      )}
      {...props}
    >
      {innerGlow && (
        <div className="absolute inset-0 bg-gradient-to-br from-[#d4af37]/5 via-transparent to-[#9d7cd8]/5 pointer-events-none" />
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

// Gradient border glass panel
interface GradientBorderPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  gradientFrom?: string;
  gradientTo?: string;
}

export function GradientBorderPanel({
  children,
  gradientFrom = "#d4af37",
  gradientTo = "#9d7cd8",
  className,
  ...props
}: GradientBorderPanelProps) {
  return (
    <div className={cn("relative p-[1px] rounded-2xl", className)} {...props}>
      {/* Gradient border */}
      <div
        className="absolute inset-0 rounded-2xl"
        style={{
          background: `linear-gradient(135deg, ${gradientFrom}40, ${gradientTo}40)`,
        }}
      />
      {/* Inner content */}
      <div className="relative bg-[#1a0a2e]/90 backdrop-blur-xl rounded-2xl">
        {children}
      </div>
    </div>
  );
}
