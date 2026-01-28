const HCAPTCHA_VERIFY_URL = "https://api.hcaptcha.com/siteverify";

export interface HCaptchaVerifyResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  credit?: boolean;
  "error-codes"?: string[];
  score?: number;
  score_reason?: string[];
}

export interface HCaptchaVerifyResult {
  success: boolean;
  error?: string;
  timestamp?: string;
  hostname?: string;
}

// Verify hCaptcha token server-side
export async function verifyHCaptcha(
  token: string,
  remoteIp?: string
): Promise<HCaptchaVerifyResult> {
  const secretKey = process.env.HCAPTCHA_SECRET_KEY;

  if (!secretKey) {
    console.error("HCAPTCHA_SECRET_KEY is not configured");
    return {
      success: false,
      error: "CAPTCHA verification not configured",
    };
  }

  if (!token) {
    return {
      success: false,
      error: "CAPTCHA token is required",
    };
  }

  try {
    const params = new URLSearchParams({
      secret: secretKey,
      response: token,
    });

    if (remoteIp) {
      params.append("remoteip", remoteIp);
    }

    const response = await fetch(HCAPTCHA_VERIFY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      return {
        success: false,
        error: `hCaptcha API error: ${response.status}`,
      };
    }

    const data: HCaptchaVerifyResponse = await response.json();

    if (data.success) {
      return {
        success: true,
        timestamp: data.challenge_ts,
        hostname: data.hostname,
      };
    }

    // Map error codes to user-friendly messages
    const errorCode = data["error-codes"]?.[0];
    const errorMessage = getHCaptchaErrorMessage(errorCode);

    return {
      success: false,
      error: errorMessage,
    };
  } catch (error) {
    console.error("hCaptcha verification error:", error);
    return {
      success: false,
      error: "Failed to verify CAPTCHA",
    };
  }
}

function getHCaptchaErrorMessage(errorCode?: string): string {
  switch (errorCode) {
    case "missing-input-secret":
      return "CAPTCHA configuration error";
    case "invalid-input-secret":
      return "CAPTCHA configuration error";
    case "missing-input-response":
      return "Please complete the CAPTCHA";
    case "invalid-input-response":
      return "Invalid CAPTCHA response. Please try again.";
    case "bad-request":
      return "Invalid CAPTCHA request";
    case "invalid-or-already-seen-response":
      return "CAPTCHA already used. Please try again.";
    case "not-using-dummy-passcode":
      return "CAPTCHA test mode error";
    case "sitekey-secret-mismatch":
      return "CAPTCHA configuration error";
    default:
      return "CAPTCHA verification failed. Please try again.";
  }
}

// Get site key for client-side use
export function getHCaptchaSiteKey(): string {
  return process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY || "";
}
