import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Initialize Redis client - will use env vars UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Rate limiters for different endpoint types
export const rateLimiters = {
  // Webhook endpoints: 100 requests per minute
  webhook: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, "1 m"),
    analytics: true,
    prefix: "ratelimit:webhook",
  }),

  // Admin API endpoints: 30 requests per minute
  admin: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, "1 m"),
    analytics: true,
    prefix: "ratelimit:admin",
  }),

  // Affiliate portal API: 20 requests per minute
  affiliate: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, "1 m"),
    analytics: true,
    prefix: "ratelimit:affiliate",
  }),

  // Login/Signup: 5 requests per minute (strict)
  auth: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "1 m"),
    analytics: true,
    prefix: "ratelimit:auth",
  }),

  // General API: 60 requests per minute
  general: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, "1 m"),
    analytics: true,
    prefix: "ratelimit:general",
  }),
};

export type RateLimitType = keyof typeof rateLimiters;

// Get the appropriate rate limiter based on the request path
export function getRateLimiterForPath(pathname: string): RateLimitType {
  if (pathname.startsWith("/api/webhooks/")) {
    return "webhook";
  }
  if (pathname.startsWith("/api/admin/")) {
    return "admin";
  }
  if (pathname.startsWith("/api/affiliate/") || pathname.startsWith("/api/apply")) {
    return "affiliate";
  }
  if (pathname.includes("/sign-in") || pathname.includes("/sign-up")) {
    return "auth";
  }
  return "general";
}

// Extract client IP from request headers
export function getClientIp(request: Request): string {
  // Check various headers in order of preference
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one (original client)
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

  // Fallback to a generic identifier if no IP found
  return "unknown";
}

// Check rate limit and return result
export async function checkRateLimit(
  request: Request,
  type?: RateLimitType
): Promise<{
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}> {
  const url = new URL(request.url);
  const limiterType = type || getRateLimiterForPath(url.pathname);
  const limiter = rateLimiters[limiterType];

  const ip = getClientIp(request);
  const identifier = `${ip}:${url.pathname}`;

  const result = await limiter.limit(identifier);

  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  };
}

// Create rate limit response headers
export function createRateLimitHeaders(result: {
  limit: number;
  remaining: number;
  reset: number;
}): Headers {
  const headers = new Headers();
  headers.set("X-RateLimit-Limit", result.limit.toString());
  headers.set("X-RateLimit-Remaining", result.remaining.toString());
  headers.set("X-RateLimit-Reset", result.reset.toString());
  return headers;
}

// Create 429 Too Many Requests response
export function createRateLimitResponse(result: {
  limit: number;
  remaining: number;
  reset: number;
}): Response {
  const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);

  return new Response(
    JSON.stringify({
      error: "Too many requests",
      message: "Rate limit exceeded. Please try again later.",
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": retryAfter.toString(),
        "X-RateLimit-Limit": result.limit.toString(),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": result.reset.toString(),
      },
    }
  );
}
