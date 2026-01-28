"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  variant?: "default" | "gold" | "purple";
  className?: string;
}

const sizeMap = {
  sm: "h-4 w-4",
  md: "h-8 w-8",
  lg: "h-12 w-12",
};

const variantMap = {
  default: "border-[#d4af37]",
  gold: "border-[#d4af37]",
  purple: "border-[#9d7cd8]",
};

export function LoadingSpinner({
  size = "md",
  variant = "default",
  className,
}: LoadingSpinnerProps) {
  return (
    <div
      className={cn(
        "animate-spin rounded-full border-2 border-t-transparent",
        sizeMap[size],
        variantMap[variant],
        className
      )}
    />
  );
}

// Magical orb loading animation
interface LoadingOrbProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const orbSizeMap = {
  sm: { container: "h-6 w-6", orb: "h-2 w-2" },
  md: { container: "h-10 w-10", orb: "h-3 w-3" },
  lg: { container: "h-16 w-16", orb: "h-4 w-4" },
};

export function LoadingOrb({ size = "md", className }: LoadingOrbProps) {
  const { container, orb } = orbSizeMap[size];

  return (
    <div className={cn("relative", container, className)}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className={cn(
            "absolute rounded-full",
            orb,
            i === 0 && "bg-[#d4af37]",
            i === 1 && "bg-[#e5c04a]",
            i === 2 && "bg-[#9d7cd8]"
          )}
          animate={{
            rotate: 360,
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "linear",
            delay: i * 0.2,
          }}
          style={{
            top: "50%",
            left: "50%",
            marginTop: "-50%",
            marginLeft: "-50%",
            transformOrigin: "50% 100%",
          }}
        />
      ))}
      <motion.div
        className={cn("absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#d4af37]/30", orb)}
        animate={{
          scale: [1, 1.5, 1],
          opacity: [0.5, 1, 0.5],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}

// Pulsing dots loading
interface LoadingDotsProps {
  className?: string;
}

export function LoadingDots({ className }: LoadingDotsProps) {
  return (
    <div className={cn("flex space-x-1", className)}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="h-2 w-2 rounded-full bg-[#d4af37]"
          animate={{
            y: ["0%", "-50%", "0%"],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.15,
          }}
        />
      ))}
    </div>
  );
}

// Full page loading overlay
interface LoadingOverlayProps {
  message?: string;
}

export function LoadingOverlay({ message = "Loading..." }: LoadingOverlayProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0a0612]/90 backdrop-blur-sm"
    >
      <LoadingOrb size="lg" />
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-6 font-heading text-lg text-[#d4af37] tracking-wide"
      >
        {message}
      </motion.p>
    </motion.div>
  );
}
