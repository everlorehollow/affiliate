"use client";

import HCaptcha from "@hcaptcha/react-hcaptcha";
import { useRef, useCallback } from "react";

interface HCaptchaWidgetProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: (error: string) => void;
  size?: "normal" | "compact" | "invisible";
  theme?: "light" | "dark";
}

export default function HCaptchaWidget({
  onVerify,
  onExpire,
  onError,
  size = "normal",
  theme = "light",
}: HCaptchaWidgetProps) {
  const captchaRef = useRef<HCaptcha>(null);

  const siteKey = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY;

  const handleVerify = useCallback(
    (token: string) => {
      onVerify(token);
    },
    [onVerify]
  );

  const handleExpire = useCallback(() => {
    if (onExpire) {
      onExpire();
    }
  }, [onExpire]);

  const handleError = useCallback(
    (error: string) => {
      console.error("hCaptcha error:", error);
      if (onError) {
        onError(error);
      }
    },
    [onError]
  );

  // Expose reset function through ref
  const resetCaptcha = useCallback(() => {
    captchaRef.current?.resetCaptcha();
  }, []);

  if (!siteKey) {
    console.warn("NEXT_PUBLIC_HCAPTCHA_SITE_KEY is not configured");
    return (
      <div className="text-sm text-amber-600 p-2 bg-amber-50 rounded">
        CAPTCHA not configured
      </div>
    );
  }

  return (
    <div className="hcaptcha-widget">
      <HCaptcha
        ref={captchaRef}
        sitekey={siteKey}
        onVerify={handleVerify}
        onExpire={handleExpire}
        onError={handleError}
        size={size}
        theme={theme}
      />
    </div>
  );
}

// Hook for managing hCaptcha state in forms
export function useHCaptcha() {
  const captchaRef = useRef<HCaptcha>(null);

  const reset = useCallback(() => {
    captchaRef.current?.resetCaptcha();
  }, []);

  const execute = useCallback(() => {
    captchaRef.current?.execute();
  }, []);

  return {
    captchaRef,
    reset,
    execute,
  };
}
