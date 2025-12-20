/**
 * Rate Limiter with Redis (TCP)
 *
 * Optional rate limiting for AI endpoints using rate-limiter-flexible with ioredis.
 * Enabled when REDIS_URL is set, and either NODE_ENV is "production" OR RATE_LIMIT_ENABLED is "true".
 *
 * Uses fixed window algorithm for efficient rate limiting.
 * Falls back to no-op when disabled for local development.
 */

import Redis from "ioredis";
import { RateLimiterRedis } from "rate-limiter-flexible";
import { logger } from "./logger";

export type RateLimitTier = "expensive" | "moderate" | "light";

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
}

// Tier configuration: points per minute
const TIER_CONFIG = {
  expensive: { points: 10, duration: 60 }, // 10 requests per minute
  moderate: { points: 20, duration: 60 }, // 20 requests per minute
  light: { points: 50, duration: 60 }, // 50 requests per minute
} as const;

// Redis key prefix (allows sharing Redis instance across apps)
const KEY_PREFIX = process.env.REDIS_PREFIX || "synchire";

/**
 * Check if rate limiting is enabled
 */
function isRateLimitEnabled(): boolean {
  const hasRedis = Boolean(process.env.REDIS_URL);
  const isProduction = process.env.NODE_ENV === "production";
  const forceEnabled = process.env.RATE_LIMIT_ENABLED === "true";
  const forceDisabled = process.env.RATE_LIMIT_ENABLED === "false";

  if (forceDisabled) {
    return false;
  }

  return hasRedis && (isProduction || forceEnabled);
}

/**
 * Create Redis client with proper TLS configuration for Upstash
 */
function createRedisClient(): Redis | null {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    return null;
  }

  // Parse the URL to extract host for SNI
  const url = new URL(redisUrl);

  return new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    // TLS configuration for Upstash (uses rediss:// protocol)
    tls: redisUrl.startsWith("rediss://")
      ? { servername: url.hostname }
      : undefined,
  });
}

// Lazy singletons
let redisClient: Redis | null | undefined;
let rateLimiters:
  | {
      expensive: RateLimiterRedis;
      moderate: RateLimiterRedis;
      light: RateLimiterRedis;
    }
  | null
  | undefined;

function getRedisClient(): Redis | null {
  if (redisClient === undefined) {
    redisClient = isRateLimitEnabled() ? createRedisClient() : null;
  }
  return redisClient;
}

function getRateLimiters() {
  if (rateLimiters === undefined) {
    const client = getRedisClient();
    if (!client) {
      rateLimiters = null;
    } else {
      rateLimiters = {
        expensive: new RateLimiterRedis({
          storeClient: client,
          keyPrefix: `${KEY_PREFIX}:ratelimit:expensive`,
          points: TIER_CONFIG.expensive.points,
          duration: TIER_CONFIG.expensive.duration,
        }),
        moderate: new RateLimiterRedis({
          storeClient: client,
          keyPrefix: `${KEY_PREFIX}:ratelimit:moderate`,
          points: TIER_CONFIG.moderate.points,
          duration: TIER_CONFIG.moderate.duration,
        }),
        light: new RateLimiterRedis({
          storeClient: client,
          keyPrefix: `${KEY_PREFIX}:ratelimit:light`,
          points: TIER_CONFIG.light.points,
          duration: TIER_CONFIG.light.duration,
        }),
      };
    }
  }
  return rateLimiters;
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
    const reason = !process.env.REDIS_URL
      ? "REDIS_URL not set"
      : process.env.RATE_LIMIT_ENABLED === "false"
        ? "RATE_LIMIT_ENABLED=false"
        : "Not in production (set RATE_LIMIT_ENABLED=true to enable)";

    logger.info("Rate limiting disabled", { api: "rate-limiter", reason });
    return { enabled: false, connected: false, latencyMs: 0, reason };
  }

  const client = getRedisClient();
  if (!client) {
    logger.warn("Rate limiting enabled but Redis client creation failed", {
      api: "rate-limiter",
    });
    return {
      enabled: true,
      connected: false,
      latencyMs: 0,
      reason: "Redis client creation failed",
    };
  }

  try {
    // First ping (cold - includes TCP handshake, TLS)
    const start1 = Date.now();
    await client.ping();
    const coldLatencyMs = Date.now() - start1;

    // Second ping (warm - connection reused)
    const start2 = Date.now();
    await client.ping();
    const warmLatencyMs = Date.now() - start2;

    const redisUrl = new URL(process.env.REDIS_URL ?? "");
    logger.info("Rate limiting enabled", {
      api: "rate-limiter",
      protocol: "TCP",
      host: redisUrl.hostname,
      port: redisUrl.port || "6379",
      prefix: KEY_PREFIX,
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
  endpoint?: string,
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
    const result = await limiter.consume(key, 1);

    return {
      allowed: true,
      remaining: result.remainingPoints,
      resetInSeconds: Math.ceil(result.msBeforeNext / 1000),
    };
  } catch (error) {
    // RateLimiterRes is thrown when limit exceeded
    if (
      error &&
      typeof error === "object" &&
      "remainingPoints" in error &&
      "msBeforeNext" in error
    ) {
      const rateLimitError = error as {
        remainingPoints: number;
        msBeforeNext: number;
      };

      logger.warn("Rate limit exceeded", {
        api: "rate-limiter",
        identifier,
        tier,
        endpoint,
        remaining: rateLimitError.remainingPoints,
      });

      return {
        allowed: false,
        remaining: rateLimitError.remainingPoints,
        resetInSeconds: Math.ceil(rateLimitError.msBeforeNext / 1000),
      };
    }

    // On unexpected error, allow the request but log warning
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
 * Uses IETF draft-ietf-httpapi-ratelimit-headers-10 format
 * @see https://datatracker.ietf.org/doc/draft-ietf-httpapi-ratelimit-headers/
 */
export function createRateLimitResponse(
  result: RateLimitResult,
  tier: RateLimitTier,
): Response {
  const { points: quota, duration: window } = TIER_CONFIG[tier];

  return new Response(
    JSON.stringify({
      success: false,
      error: "Too many requests. Please try again later.",
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": result.resetInSeconds.toString(),
        "RateLimit-Policy": `"${tier}";q=${quota};w=${window}`,
        RateLimit: `"${tier}";r=${result.remaining};t=${result.resetInSeconds}`,
      },
    },
  );
}

/**
 * Helper to get identifier from request (user ID or IP)
 */
export function getRequestIdentifier(
  request: Request,
  userId?: string | null,
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
  userId?: string | null,
): Promise<Response | null> {
  const identifier = getRequestIdentifier(request, userId);
  const result = await checkRateLimit(identifier, tier, endpoint);

  if (!result.allowed) {
    return createRateLimitResponse(result, tier);
  }

  return null;
}
