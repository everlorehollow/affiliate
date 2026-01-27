"use client";

import { useState } from "react";

interface CopyButtonProps {
  text: string;
}

export function CopyButton({ text }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="px-6 py-3 bg-[#d4af37] hover:bg-[#b8962e] text-[#1a0a2e] font-semibold rounded-lg transition-colors"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}
