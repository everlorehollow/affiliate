import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium font-heading tracking-wide transition-colors",
  {
    variants: {
      variant: {
        default:
          "bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/30",
        secondary:
          "bg-[#9d7cd8]/20 text-[#9d7cd8] border border-[#9d7cd8]/30",
        success:
          "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
        warning:
          "bg-amber-500/20 text-amber-400 border border-amber-500/30",
        destructive:
          "bg-red-500/20 text-red-400 border border-red-500/30",
        outline:
          "text-[#f5f5f5] border border-[#d4af37]/30",
        glow:
          "bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/50 shadow-[0_0_10px_rgba(212,175,55,0.3)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
