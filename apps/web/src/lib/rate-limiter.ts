/**
 * Rate Limiter with Upstash Redis
 *
 * Optional rate limiting for AI endpoints using @upstash/ratelimit.
 * Enabled when UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set,
 * and either NODE_ENV is "production" OR RATE_LIMIT_ENABLED is "true".
 *
 * Uses sliding window algorithm for fair rate limiting.
 * Falls back to no-op when disabled for local development.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { logger } from "./logger";

export type RateLimitTier = "expensive" | "moderate" | "light";

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
}

/**
 * Check if rate limiting is enabled
 */
function isRateLimitEnabled(): boolean {
  const hasUpstash = Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  );
  const isProduction = process.env.NODE_ENV === "production";
  const forceEnabled = process.env.RATE_LIMIT_ENABLED === "true";
  const forceDisabled = process.env.RATE_LIMIT_ENABLED === "false";

  if (forceDisabled) {
    return false;
  }

  return hasUpstash && (isProduction || forceEnabled);
}

/**
 * Create rate limiters for each tier (lazy initialization)
 */
function createRateLimiters() {
  if (!isRateLimitEnabled()) {
    return null;
  }

  const redis = Redis.fromEnv();

  return {
    // CV extraction, JD extraction, match-candidates (expensive AI operations)
    expensive: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "60 s"),
      prefix: "ratelimit:expensive",
      analytics: true,
    }),
    // Question generation, interview analysis
    moderate: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, "60 s"),
      prefix: "ratelimit:moderate",
      analytics: true,
    }),
    // Lighter operations
    light: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(50, "60 s"),
      prefix: "ratelimit:light",
      analytics: true,
    }),
  };
}

// Lazy singleton - only created when first accessed
let rateLimitersInstance: ReturnType<typeof createRateLimiters> | undefined;

function getRateLimiters() {
  if (rateLimitersInstance === undefined) {
    rateLimitersInstance = createRateLimiters();
  }
  return rateLimitersInstance;
}

/**
 * Validate rate limit connection on startup
 * Returns connection status and latency
 */
export async function validateRateLimitConnection(): Promise<{
  enabled: boolean;
  connected: boolean;
  latencyMs: number;
  reason?: string;
}> {
  const enabled = isRateLimitEnabled();

  if (!enabled) {
    const reason = !process.env.UPSTASH_REDIS_REST_URL
      ? "UPSTASH_REDIS_REST_URL not set"
      : !process.env.UPSTASH_REDIS_REST_TOKEN
        ? "UPSTASH_REDIS_REST_TOKEN not set"
        : process.env.RATE_LIMIT_ENABLED === "false"
          ? "RATE_LIMIT_ENABLED=false"
          : "Not in production (set RATE_LIMIT_ENABLED=true to enable)";

    logger.info("Rate limiting disabled", { api: "rate-limiter", reason });
    return { enabled: false, connected: false, latencyMs: 0, reason };
  }

  try {
    const redis = Redis.fromEnv();

    // First ping (cold - includes DNS, TLS handshake)
    const start1 = Date.now();
    await redis.ping();
    const coldLatencyMs = Date.now() - start1;

    // Second ping (warm - connection reused)
    const start2 = Date.now();
    await redis.ping();
    const warmLatencyMs = Date.now() - start2;

    logger.info("Rate limiting enabled", {
      api: "rate-limiter",
      coldLatencyMs,
      warmLatencyMs,
      tiers: { expensive: "10/min", moderate: "20/min", light: "50/min" },
    });

    return { enabled: true, connected: true, latencyMs: warmLatencyMs };
  } catch (error) {
    logger.warn("Rate limiting enabled but Redis connection failed", {
      api: "rate-limiter",
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return {
      enabled: true,
      connected: false,
      latencyMs: 0,
      reason: error instanceof Error ? error.message : "Connection failed",
    };
  }
}

/**
 * Check rate limit for a given identifier (user ID, IP, etc.)
 */
export async function checkRateLimit(
  identifier: string,
  tier: RateLimitTier = "moderate",
  endpoint?: string
): Promise<RateLimitResult> {
  const limiters = getRateLimiters();

  // If rate limiting not enabled, allow all requests
  if (!limiters) {
    return {
      allowed: true,
      remaining: 999,
      resetInSeconds: 0,
    };
  }

  const limiter = limiters[tier];
  const key = endpoint ? `${identifier}:${endpoint}` : identifier;

  try {
    const { success, remaining, reset } = await limiter.limit(key);

    if (!success) {
      logger.warn("Rate limit exceeded", {
        api: "rate-limiter",
        identifier,
        tier,
        endpoint,
        remaining,
      });
    }

    // Convert reset timestamp to seconds from now
    const resetInSeconds = Math.max(0, Math.ceil((reset - Date.now()) / 1000));

    return {
      allowed: success,
      remaining,
      resetInSeconds,
    };
  } catch (error) {
    // On error, allow the request but log warning
    logger.warn("Rate limit check failed, allowing request", {
      api: "rate-limiter",
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return {
      allowed: true,
      remaining: 999,
      resetInSeconds: 0,
    };
  }
}

/**
 * Create a rate limit response with proper headers
 */
export function createRateLimitResponse(result: RateLimitResult): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: "Too many requests. Please try again later.",
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "X-RateLimit-Remaining": result.remaining.toString(),
        "X-RateLimit-Reset": result.resetInSeconds.toString(),
        "Retry-After": result.resetInSeconds.toString(),
      },
    }
  );
}

/**
 * Helper to get identifier from request (user ID or IP)
 */
export function getRequestIdentifier(
  request: Request,
  userId?: string | null
): string {
  if (userId) {
    return `user:${userId}`;
  }

  // Fallback to IP address
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? "unknown";
  return `ip:${ip}`;
}

/**
 * Combined rate limit check that returns a 429 response if exceeded, or null if allowed.
 * Simplifies the common pattern in route handlers.
 */
export async function withRateLimit(
  request: Request,
  tier: RateLimitTier,
  endpoint: string,
  userId?: string | null
): Promise<Response | null> {
  const identifier = getRequestIdentifier(request, userId);
  const result = await checkRateLimit(identifier, tier, endpoint);

  if (!result.allowed) {
    return createRateLimitResponse(result);
  }

  return null;
}
