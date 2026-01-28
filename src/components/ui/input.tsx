"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  icon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, icon, onFocus, onBlur, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      onBlur?.(e);
    };

    return (
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9d7cd8]">
            {icon}
          </div>
        )}
        <input
          type={type}
          className={cn(
            "flex h-11 w-full rounded-lg border bg-[#2c0046]/80 px-4 py-2 text-base text-[#f5f5f5] font-body placeholder:text-[#9d7cd8]/50 transition-all duration-300",
            "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#1a0a2e]",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error
              ? "border-red-500/50 focus:border-red-500 focus:ring-red-500/30"
              : "border-[#d4af37]/30 focus:border-[#d4af37] focus:ring-[#d4af37]/30",
            icon && "pl-10",
            className
          )}
          ref={ref}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={{
            boxShadow: isFocused
              ? "0 0 20px rgba(212, 175, 55, 0.15)"
              : "0 0 0px rgba(212, 175, 55, 0)",
          }}
          {...props}
        />
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
