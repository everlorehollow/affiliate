"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface CopyButtonProps {
  text: string;
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function CopyButton({
  text,
  variant = "default",
  size = "md",
  className,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sizeStyles = {
    sm: "px-3 py-1.5 text-xs gap-1.5",
    md: "px-5 py-2.5 text-sm gap-2",
    lg: "px-6 py-3 text-base gap-2",
  };

  const variantStyles = {
    default:
      "bg-gradient-to-r from-[#d4af37] to-[#b8962e] text-[#1a0a2e] shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:shadow-[0_0_30px_rgba(212,175,55,0.5)]",
    outline:
      "border border-[#d4af37]/50 bg-transparent text-[#d4af37] hover:bg-[#d4af37]/10 hover:border-[#d4af37]",
    ghost: "text-[#d4af37] hover:bg-[#d4af37]/10",
  };

  return (
    <motion.button
      onClick={handleCopy}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "relative inline-flex items-center justify-center font-heading font-semibold tracking-wide rounded-lg transition-all duration-300 overflow-hidden",
        sizeStyles[size],
        variantStyles[variant],
        className
      )}
    >
      <AnimatePresence mode="wait">
        {copied ? (
          <motion.span
            key="copied"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2"
          >
            <Check className={cn(size === "sm" ? "h-3 w-3" : "h-4 w-4")} />
            Copied!
          </motion.span>
        ) : (
          <motion.span
            key="copy"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2"
          >
            <Copy className={cn(size === "sm" ? "h-3 w-3" : "h-4 w-4")} />
            Copy
          </motion.span>
        )}
      </AnimatePresence>

      {/* Shimmer effect */}
      <motion.div
        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent"
        animate={{
          translateX: copied ? "200%" : "-100%",
        }}
        transition={{
          duration: 0.5,
          ease: "easeInOut",
        }}
      />
    </motion.button>
  );
}
