import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Define protected routes that require authentication
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/referrals(.*)",
  "/payouts(.*)",
  "/assets(.*)",
  "/settings(.*)",
  "/admin(.*)",
]);

// Rate limiter types
type RateLimiterType = "webhook" | "admin" | "affiliate" | "auth" | "general";

type RateLimitersMap = {
  [K in RateLimiterType]: Ratelimit;
};

// Initialize Redis client for rate limiting (only if configured)
let redis: Redis | null = null;
let rateLimiters: RateLimitersMap | null = null;

// Initialize rate limiters if Redis is configured
function initRateLimiters() {
  if (rateLimiters) return rateLimiters;

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    console.warn("Rate limiting disabled: UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not configured");
    return null;
  }

  try {
    redis = new Redis({
      url: redisUrl,
      token: redisToken,
    });

    rateLimiters = {
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

    return rateLimiters;
  } catch (error) {
    console.error("Failed to initialize rate limiters:", error);
    return null;
  }
}

// Get the appropriate rate limiter based on the request path
function getRateLimiterType(pathname: string): RateLimiterType | null {
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
  if (pathname.startsWith("/api/")) {
    return "general";
  }
  return null;
}

// Extract client IP from request headers
function getClientIp(request: NextRequest): string {
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

// Rate limiting check
async function checkRateLimit(request: NextRequest): Promise<NextResponse | null> {
  const limiters = initRateLimiters();
  if (!limiters) {
    return null; // Rate limiting not configured, skip
  }

  const url = new URL(request.url);
  const limiterType = getRateLimiterType(url.pathname);

  if (!limiterType) {
    return null; // No rate limiting for this path
  }

  const limiter = limiters[limiterType];
  const ip = getClientIp(request);
  const identifier = `${ip}:${url.pathname}`;

  try {
    const result = await limiter.limit(identifier);

    if (!result.success) {
      const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);

      return new NextResponse(
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

    return null;
  } catch (error) {
    console.error("Rate limit check error:", error);
    return null; // On error, allow the request through
  }
}

// Export the proxy function (Next.js 16 convention)
export default clerkMiddleware(async (auth, req) => {
  // Apply rate limiting first
  const rateLimitResponse = await checkRateLimit(req);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
