import { createServerClient } from "./supabase";

export interface ActivityLogEntry {
  affiliate_id?: string;
  action: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
}

// Extract client IP from request
export function extractClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  const cfConnectingIp = request.headers.get("cf-connecting-ip");
  if (cfConnectingIp) {
    return cfConnectingIp.trim();
  }

  return "unknown";
}

// Extract user agent from request
export function extractUserAgent(request: Request): string {
  return request.headers.get("user-agent") || "unknown";
}

// Log activity to the database
export async function logActivity(entry: ActivityLogEntry): Promise<void> {
  try {
    const supabase = createServerClient();

    const { error } = await supabase.from("activity_log").insert({
      affiliate_id: entry.affiliate_id || null,
      action: entry.action,
      details: entry.details || {},
      ip_address: entry.ip_address || null,
      user_agent: entry.user_agent || null,
    });

    if (error) {
      console.error("Failed to log activity:", error);
    }
  } catch (error) {
    console.error("Activity logging error:", error);
  }
}

// Log activity with request context
export async function logActivityWithRequest(
  request: Request,
  action: string,
  details?: Record<string, unknown>,
  affiliateId?: string
): Promise<void> {
  await logActivity({
    affiliate_id: affiliateId,
    action,
    details,
    ip_address: extractClientIp(request),
    user_agent: extractUserAgent(request),
  });
}

// Log webhook activity
export async function logWebhookActivity(
  request: Request,
  source: "shopify" | "recharge" | "paypal",
  event: string,
  success: boolean,
  details?: Record<string, unknown>
): Promise<void> {
  await logActivityWithRequest(
    request,
    `webhook_${source}_${event}`,
    {
      ...details,
      success,
      timestamp: new Date().toISOString(),
    }
  );
}

// Log admin action
export async function logAdminAction(
  request: Request,
  adminUserId: string,
  action: string,
  details?: Record<string, unknown>
): Promise<void> {
  await logActivityWithRequest(
    request,
    `admin_${action}`,
    {
      ...details,
      admin_user_id: adminUserId,
      timestamp: new Date().toISOString(),
    }
  );
}

// Log fraud detection event
export async function logFraudFlag(
  request: Request,
  reason: string,
  details: Record<string, unknown>,
  affiliateId?: string
): Promise<void> {
  await logActivityWithRequest(
    request,
    "fraud_flag",
    {
      reason,
      ...details,
      timestamp: new Date().toISOString(),
    },
    affiliateId
  );
}

// Log rate limit event
export async function logRateLimitHit(
  request: Request,
  endpoint: string,
  identifier: string
): Promise<void> {
  await logActivityWithRequest(
    request,
    "rate_limit_exceeded",
    {
      endpoint,
      identifier,
      timestamp: new Date().toISOString(),
    }
  );
}
