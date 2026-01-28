import { createServerClient } from "./supabase";
import { extractClientIp, extractUserAgent } from "./activity-log";

export type ErrorSeverity = "info" | "warning" | "error" | "critical";

export type ErrorType =
  | "webhook_error"
  | "api_error"
  | "payout_error"
  | "shopify_error"
  | "recharge_error"
  | "paypal_error"
  | "database_error"
  | "validation_error"
  | "auth_error"
  | "rate_limit_error"
  | "unknown_error";

export type ErrorSource =
  | "shopify_webhook"
  | "recharge_webhook"
  | "paypal_webhook"
  | "paypal_api"
  | "shopify_api"
  | "admin_api"
  | "affiliate_api"
  | "auth"
  | "database"
  | "unknown";

export interface SystemErrorEntry {
  error_type: ErrorType;
  severity?: ErrorSeverity;
  message: string;
  stack_trace?: string;
  source: ErrorSource;
  endpoint?: string;
  affiliate_id?: string;
  order_id?: string;
  payout_id?: string;
  request_payload?: Record<string, unknown>;
  response_payload?: Record<string, unknown>;
  http_status?: number;
  details?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
}

/**
 * Log a system error to the database
 */
export async function logSystemError(entry: SystemErrorEntry): Promise<string | null> {
  try {
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from("system_errors")
      .insert({
        error_type: entry.error_type,
        severity: entry.severity || "error",
        message: entry.message,
        stack_trace: entry.stack_trace,
        source: entry.source,
        endpoint: entry.endpoint,
        affiliate_id: entry.affiliate_id || null,
        order_id: entry.order_id,
        payout_id: entry.payout_id || null,
        request_payload: entry.request_payload,
        response_payload: entry.response_payload,
        http_status: entry.http_status,
        details: entry.details,
        ip_address: entry.ip_address,
        user_agent: entry.user_agent,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Failed to log system error:", error);
      return null;
    }

    return data?.id || null;
  } catch (err) {
    console.error("Error logging system error:", err);
    return null;
  }
}

/**
 * Log a system error with request context
 */
export async function logSystemErrorWithRequest(
  request: Request,
  entry: Omit<SystemErrorEntry, "ip_address" | "user_agent">
): Promise<string | null> {
  return logSystemError({
    ...entry,
    ip_address: extractClientIp(request),
    user_agent: extractUserAgent(request),
  });
}

/**
 * Log a webhook error
 */
export async function logWebhookError(
  request: Request,
  source: "shopify_webhook" | "recharge_webhook" | "paypal_webhook",
  error: Error | string,
  context?: {
    endpoint?: string;
    order_id?: string;
    affiliate_id?: string;
    request_payload?: Record<string, unknown>;
    http_status?: number;
    details?: Record<string, unknown>;
  }
): Promise<string | null> {
  const errorMessage = error instanceof Error ? error.message : error;
  const stackTrace = error instanceof Error ? error.stack : undefined;

  return logSystemErrorWithRequest(request, {
    error_type: "webhook_error",
    severity: "error",
    message: errorMessage,
    stack_trace: stackTrace,
    source,
    endpoint: context?.endpoint,
    order_id: context?.order_id,
    affiliate_id: context?.affiliate_id,
    request_payload: context?.request_payload,
    http_status: context?.http_status,
    details: context?.details,
  });
}

/**
 * Log a PayPal API error
 */
export async function logPayPalError(
  request: Request,
  error: Error | string,
  context?: {
    payout_id?: string;
    affiliate_id?: string;
    request_payload?: Record<string, unknown>;
    response_payload?: Record<string, unknown>;
    http_status?: number;
    details?: Record<string, unknown>;
  }
): Promise<string | null> {
  const errorMessage = error instanceof Error ? error.message : error;
  const stackTrace = error instanceof Error ? error.stack : undefined;

  return logSystemErrorWithRequest(request, {
    error_type: "paypal_error",
    severity: "error",
    message: errorMessage,
    stack_trace: stackTrace,
    source: "paypal_api",
    payout_id: context?.payout_id,
    affiliate_id: context?.affiliate_id,
    request_payload: context?.request_payload,
    response_payload: context?.response_payload,
    http_status: context?.http_status,
    details: context?.details,
  });
}

/**
 * Log a Shopify API error
 */
export async function logShopifyError(
  error: Error | string,
  context?: {
    endpoint?: string;
    affiliate_id?: string;
    request_payload?: Record<string, unknown>;
    response_payload?: Record<string, unknown>;
    http_status?: number;
    details?: Record<string, unknown>;
  }
): Promise<string | null> {
  const errorMessage = error instanceof Error ? error.message : error;
  const stackTrace = error instanceof Error ? error.stack : undefined;

  return logSystemError({
    error_type: "shopify_error",
    severity: "error",
    message: errorMessage,
    stack_trace: stackTrace,
    source: "shopify_api",
    endpoint: context?.endpoint,
    affiliate_id: context?.affiliate_id,
    request_payload: context?.request_payload,
    response_payload: context?.response_payload,
    http_status: context?.http_status,
    details: context?.details,
  });
}

/**
 * Log a database error
 */
export async function logDatabaseError(
  error: Error | string,
  context?: {
    source?: ErrorSource;
    affiliate_id?: string;
    details?: Record<string, unknown>;
  }
): Promise<string | null> {
  const errorMessage = error instanceof Error ? error.message : error;
  const stackTrace = error instanceof Error ? error.stack : undefined;

  return logSystemError({
    error_type: "database_error",
    severity: "error",
    message: errorMessage,
    stack_trace: stackTrace,
    source: context?.source || "database",
    affiliate_id: context?.affiliate_id,
    details: context?.details,
  });
}

/**
 * Mark an error as resolved
 */
export async function resolveError(
  errorId: string,
  resolvedBy: string,
  notes?: string
): Promise<boolean> {
  try {
    const supabase = createServerClient();

    const { error } = await supabase
      .from("system_errors")
      .update({
        resolved: true,
        resolved_at: new Date().toISOString(),
        resolved_by: resolvedBy,
        resolution_notes: notes,
      })
      .eq("id", errorId);

    if (error) {
      console.error("Failed to resolve error:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Error resolving system error:", err);
    return false;
  }
}

/**
 * Get unresolved error count by severity
 */
export async function getUnresolvedErrorCounts(): Promise<{
  total: number;
  critical: number;
  error: number;
  warning: number;
}> {
  try {
    const supabase = createServerClient();

    const [
      { count: total },
      { count: critical },
      { count: errorCount },
      { count: warning },
    ] = await Promise.all([
      supabase
        .from("system_errors")
        .select("*", { count: "exact", head: true })
        .eq("resolved", false),
      supabase
        .from("system_errors")
        .select("*", { count: "exact", head: true })
        .eq("resolved", false)
        .eq("severity", "critical"),
      supabase
        .from("system_errors")
        .select("*", { count: "exact", head: true })
        .eq("resolved", false)
        .eq("severity", "error"),
      supabase
        .from("system_errors")
        .select("*", { count: "exact", head: true })
        .eq("resolved", false)
        .eq("severity", "warning"),
    ]);

    return {
      total: total || 0,
      critical: critical || 0,
      error: errorCount || 0,
      warning: warning || 0,
    };
  } catch (err) {
    console.error("Error getting error counts:", err);
    return { total: 0, critical: 0, error: 0, warning: 0 };
  }
}
