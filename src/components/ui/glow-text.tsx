"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlowTextProps {
  children: React.ReactNode;
  color?: "gold" | "purple" | "white";
  intensity?: "subtle" | "medium" | "strong";
  animate?: boolean;
  className?: string;
}

const colorMap = {
  gold: {
    text: "text-[#d4af37]",
    glow: "#d4af37",
  },
  purple: {
    text: "text-[#9d7cd8]",
    glow: "#9d7cd8",
  },
  white: {
    text: "text-white",
    glow: "#ffffff",
  },
};

const intensityMap = {
  subtle: { blur: 8, opacity: 0.3 },
  medium: { blur: 15, opacity: 0.5 },
  strong: { blur: 25, opacity: 0.7 },
};

export function GlowText({
  children,
  color = "gold",
  intensity = "medium",
  animate = true,
  className,
}: GlowTextProps) {
  const { text, glow } = colorMap[color];
  const { blur, opacity } = intensityMap[intensity];

  const textShadow = `0 0 ${blur}px rgba(${glow === "#d4af37" ? "212, 175, 55" : glow === "#9d7cd8" ? "157, 124, 216" : "255, 255, 255"}, ${opacity})`;

  if (animate) {
    return (
      <motion.span
        className={cn(text, className)}
        style={{ textShadow }}
        animate={{
          textShadow: [
            textShadow,
            `0 0 ${blur * 1.5}px rgba(${glow === "#d4af37" ? "212, 175, 55" : glow === "#9d7cd8" ? "157, 124, 216" : "255, 255, 255"}, ${opacity * 1.3})`,
            textShadow,
          ],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {children}
      </motion.span>
    );
  }

  return (
    <span className={cn(text, className)} style={{ textShadow }}>
      {children}
    </span>
  );
}
