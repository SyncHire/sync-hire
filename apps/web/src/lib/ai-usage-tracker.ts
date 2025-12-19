/**
 * AI Usage Tracker
 *
 * Tracks and enforces organization-level AI usage quotas.
 * Uses Redis for real-time counting with PostgreSQL for persistence.
 *
 * Architecture:
 * - Redis: Hot counter for current period (fast increments)
 * - PostgreSQL: Persistent storage, synced from Redis periodically
 * - Hybrid approach balances speed with durability
 */

import Redis from "ioredis";
import { prisma } from "@sync-hire/database";
import type { QuotaTier } from "@sync-hire/database";
import { logger } from "./logger";

// =============================================================================
// Configuration
// =============================================================================

/**
 * Monthly limits by tier
 * null = unlimited (ENTERPRISE)
 */
const TIER_LIMITS: Record<QuotaTier, number | null> = {
  FREE: 100,
  STARTER: 500,
  PROFESSIONAL: 2000,
  ENTERPRISE: null,
} as const;

/**
 * AI endpoint definitions with weights
 * Weight represents how many "AI calls" each endpoint counts as
 */
export const AI_ENDPOINTS = {
  "cv/extract": { weight: 1, description: "CV extraction" },
  "jobs/extract-jd": { weight: 2, description: "JD extraction (2 Gemini calls)" },
  "jobs/generate-questions": { weight: 1, description: "Question generation" },
  "jobs/apply": { weight: 1, description: "Application question generation" },
  "jobs/match-candidates": { weight: "dynamic", description: "Candidate matching (N calls)" },
  "jobs/create": { weight: "dynamic", description: "Job creation with auto-match" },
  "interviews/analyze": { weight: 1, description: "Interview analysis" },
} as const;

export type AIEndpoint = keyof typeof AI_ENDPOINTS;

// Redis key prefix
const KEY_PREFIX = process.env.REDIS_PREFIX || "synchire";

// =============================================================================
// Types
// =============================================================================

export interface UsageCheckResult {
  allowed: boolean;
  currentUsage: number;
  limit: number | null;
  remaining: number | null;
  periodKey: string;
  tier: QuotaTier;
  warningThreshold: boolean;
}

export interface UsageTrackResult {
  success: boolean;
  newCount: number;
  periodKey: string;
}

export interface UsageStats {
  currentUsage: number;
  limit: number | null;
  tier: QuotaTier;
  periodKey: string;
  remaining: number | null;
  percentUsed: number | null;
  breakdown: Record<string, number>;
}

// =============================================================================
// Redis Client (reuses rate-limiter pattern)
// =============================================================================

function isQuotaTrackingEnabled(): boolean {
  const hasRedis = Boolean(process.env.REDIS_URL);
  const isProduction = process.env.NODE_ENV === "production";
  const forceEnabled = process.env.QUOTA_ENFORCEMENT_ENABLED === "true";
  const forceDisabled = process.env.QUOTA_ENFORCEMENT_ENABLED === "false";

  if (forceDisabled) {
    return false;
  }

  return hasRedis && (isProduction || forceEnabled);
}

function createRedisClient(): Redis | null {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    return null;
  }

  const url = new URL(redisUrl);

  return new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    tls: redisUrl.startsWith("rediss://")
      ? { servername: url.hostname }
      : undefined,
  });
}

// Lazy singleton
let redisClient: Redis | null | undefined;

function getRedisClient(): Redis | null {
  if (redisClient === undefined) {
    redisClient = isQuotaTrackingEnabled() ? createRedisClient() : null;
  }
  return redisClient;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get current period key in YYYY-MM format
 */
export function getCurrentPeriodKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Get the first day of next month
 */
export function getNextMonthStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1);
}

/**
 * Get Redis key for organization usage counter
 */
function getUsageKey(organizationId: string, periodKey: string): string {
  return `${KEY_PREFIX}:usage:${organizationId}:${periodKey}`;
}

/**
 * Get Redis key for endpoint breakdown hash
 */
function getBreakdownKey(organizationId: string, periodKey: string): string {
  return `${KEY_PREFIX}:usage:${organizationId}:${periodKey}:breakdown`;
}

/**
 * Calculate TTL for Redis keys (end of month + 7 days buffer)
 */
function calculateTTL(): number {
  const nextMonth = getNextMonthStart();
  const buffer = 7 * 24 * 60 * 60; // 7 days in seconds
  const ttlSeconds = Math.floor((nextMonth.getTime() - Date.now()) / 1000) + buffer;
  return Math.max(ttlSeconds, 86400); // At least 1 day
}

// =============================================================================
// Core Functions
// =============================================================================

/**
 * Get or create quota for an organization
 * Creates a FREE tier quota if none exists
 */
async function getOrCreateQuota(organizationId: string) {
  let quota = await prisma.organizationQuota.findUnique({
    where: { organizationId },
    include: { usageRecords: true },
  });

  if (!quota) {
    quota = await prisma.organizationQuota.create({
      data: {
        organizationId,
        tier: "FREE",
        monthlyLimit: TIER_LIMITS.FREE,
      },
      include: { usageRecords: true },
    });

    logger.info("Created default quota for organization", {
      api: "quota",
      organizationId,
      tier: "FREE",
    });
  }

  return quota;
}

/**
 * Get current usage from Redis (fast) or PostgreSQL (fallback)
 */
async function getCurrentUsage(
  organizationId: string,
  periodKey: string,
  quotaId: string
): Promise<number> {
  const redis = getRedisClient();

  if (redis) {
    try {
      const key = getUsageKey(organizationId, periodKey);
      const redisCount = await redis.get(key);

      if (redisCount !== null) {
        return parseInt(redisCount, 10);
      }

      // Redis miss - load from PostgreSQL and cache
      const record = await prisma.aIUsageRecord.findUnique({
        where: { organizationId_periodKey: { organizationId, periodKey } },
      });

      const count = record?.usageCount ?? 0;

      // Cache in Redis with TTL
      await redis.set(key, count.toString(), "EX", calculateTTL());

      return count;
    } catch (error) {
      logger.warn("Redis error in getCurrentUsage, falling back to PostgreSQL", {
        api: "quota",
        operation: "get-usage-redis",
        organizationId,
        periodKey,
        error: error instanceof Error ? error.message : String(error),
      });
      // Fall through to PostgreSQL
    }
  }

  // No Redis or Redis error - use PostgreSQL directly
  const record = await prisma.aIUsageRecord.findUnique({
    where: { organizationId_periodKey: { organizationId, periodKey } },
  });

  return record?.usageCount ?? 0;
}

/**
 * Check if organization can make an AI request
 * Does NOT increment usage - call trackUsage() after successful AI call
 */
export async function checkQuota(organizationId: string): Promise<UsageCheckResult> {
  const periodKey = getCurrentPeriodKey();
  const quota = await getOrCreateQuota(organizationId);
  const limit = quota.monthlyLimit;
  const currentUsage = await getCurrentUsage(organizationId, periodKey, quota.id);

  // ENTERPRISE has unlimited usage
  if (limit === null) {
    return {
      allowed: true,
      currentUsage,
      limit: null,
      remaining: null,
      periodKey,
      tier: quota.tier,
      warningThreshold: false,
    };
  }

  const remaining = Math.max(0, limit - currentUsage);
  const allowed = currentUsage < limit;
  const warningThreshold = currentUsage >= (limit * quota.warningThreshold) / 100;

  return {
    allowed,
    currentUsage,
    limit,
    remaining,
    periodKey,
    tier: quota.tier,
    warningThreshold,
  };
}

/**
 * Track usage after a successful AI call
 * @param organizationId - The organization ID
 * @param endpoint - The AI endpoint that was called
 * @param count - Number of AI calls made (for dynamic weight endpoints)
 */
export async function trackUsage(
  organizationId: string,
  endpoint: AIEndpoint,
  count: number = 1
): Promise<UsageTrackResult> {
  const periodKey = getCurrentPeriodKey();
  const redis = getRedisClient();

  // Calculate actual count based on endpoint weight
  const endpointConfig = AI_ENDPOINTS[endpoint];
  const weight = typeof endpointConfig.weight === "number" ? endpointConfig.weight : 1;
  const actualCount = count * weight;

  let newCount = 0;
  let usedRedis = false;

  if (redis) {
    try {
      const key = getUsageKey(organizationId, periodKey);
      const breakdownKey = getBreakdownKey(organizationId, periodKey);
      const ttl = calculateTTL();

      // Atomic increment in Redis
      newCount = await redis.incrby(key, actualCount);

      // Set TTL if this is a new key
      await redis.expire(key, ttl);

      // Update endpoint breakdown
      await redis.hincrby(breakdownKey, endpoint, actualCount);
      await redis.expire(breakdownKey, ttl);

      usedRedis = true;

      // Async sync to PostgreSQL (don't block the response)
      syncToPostgreSQL(organizationId, periodKey, newCount, endpoint, actualCount).catch(
        (error) => {
          logger.error(error, {
            api: "quota",
            operation: "sync-to-postgresql",
            organizationId,
            periodKey,
            endpoint,
            count: actualCount,
          });
        }
      );
    } catch (error) {
      logger.warn("Redis error in trackUsage, falling back to PostgreSQL", {
        api: "quota",
        operation: "track-redis",
        organizationId,
        endpoint,
        count: actualCount,
        error: error instanceof Error ? error.message : String(error),
      });
      // Fall through to PostgreSQL
    }
  }

  if (!usedRedis) {
    // No Redis - update PostgreSQL directly
    const quota = await getOrCreateQuota(organizationId);

    const record = await prisma.aIUsageRecord.upsert({
      where: { organizationId_periodKey: { organizationId, periodKey } },
      create: {
        organizationId,
        quotaId: quota.id,
        periodKey,
        usageCount: actualCount,
        endpointBreakdown: { [endpoint]: actualCount },
      },
      update: {
        usageCount: { increment: actualCount },
        endpointBreakdown: {
          // Prisma doesn't support JSON field increment, so we need to handle this
          // This will be properly updated in syncToPostgreSQL
        },
      },
    });

    newCount = record.usageCount;
  }

  logger.info("Tracked AI usage", {
    api: "quota",
    organizationId,
    endpoint,
    count: actualCount,
    newTotal: newCount,
    periodKey,
  });

  return {
    success: true,
    newCount,
    periodKey,
  };
}

/**
 * Sync Redis counter to PostgreSQL for durability
 */
async function syncToPostgreSQL(
  organizationId: string,
  periodKey: string,
  totalCount: number,
  endpoint: AIEndpoint,
  incrementCount: number
): Promise<void> {
  const quota = await getOrCreateQuota(organizationId);

  // Get current breakdown from PostgreSQL
  const existingRecord = await prisma.aIUsageRecord.findUnique({
    where: { organizationId_periodKey: { organizationId, periodKey } },
  });

  const currentBreakdown = (existingRecord?.endpointBreakdown as Record<string, number>) ?? {};
  const newBreakdown = {
    ...currentBreakdown,
    [endpoint]: (currentBreakdown[endpoint] ?? 0) + incrementCount,
  };

  await prisma.aIUsageRecord.upsert({
    where: { organizationId_periodKey: { organizationId, periodKey } },
    create: {
      organizationId,
      quotaId: quota.id,
      periodKey,
      usageCount: totalCount,
      endpointBreakdown: newBreakdown,
    },
    update: {
      usageCount: totalCount,
      endpointBreakdown: newBreakdown,
    },
  });
}

/**
 * Get usage statistics for an organization
 */
export async function getUsage(organizationId: string): Promise<UsageStats> {
  const periodKey = getCurrentPeriodKey();
  const quota = await getOrCreateQuota(organizationId);
  const currentUsage = await getCurrentUsage(organizationId, periodKey, quota.id);
  const limit = quota.monthlyLimit;

  // Get breakdown from Redis or PostgreSQL
  let breakdown: Record<string, number> = {};
  const redis = getRedisClient();
  let gotFromRedis = false;

  if (redis) {
    try {
      const breakdownKey = getBreakdownKey(organizationId, periodKey);
      const redisBreakdown = await redis.hgetall(breakdownKey);
      breakdown = Object.fromEntries(
        Object.entries(redisBreakdown).map(([k, v]) => [k, parseInt(v, 10)])
      );
      gotFromRedis = true;
    } catch (error) {
      logger.warn("Redis error in getUsage breakdown, falling back to PostgreSQL", {
        api: "quota",
        operation: "get-breakdown-redis",
        organizationId,
        periodKey,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (!gotFromRedis) {
    const record = await prisma.aIUsageRecord.findUnique({
      where: { organizationId_periodKey: { organizationId, periodKey } },
    });
    breakdown = (record?.endpointBreakdown as Record<string, number>) ?? {};
  }

  return {
    currentUsage,
    limit,
    tier: quota.tier,
    periodKey,
    remaining: limit !== null ? Math.max(0, limit - currentUsage) : null,
    percentUsed: limit !== null ? Math.round((currentUsage / limit) * 100) : null,
    breakdown,
  };
}

/**
 * Initialize quota for a new organization
 * Called when an organization is created
 */
export async function initializeQuota(
  organizationId: string,
  tier: QuotaTier = "FREE"
): Promise<void> {
  const limit = TIER_LIMITS[tier];

  await prisma.organizationQuota.create({
    data: {
      organizationId,
      tier,
      monthlyLimit: limit,
    },
  });

  logger.info("Initialized quota for new organization", {
    api: "quota",
    organizationId,
    tier,
    limit,
  });
}

/**
 * Validate quota tracking connection (similar to rate limiter validation)
 */
export async function validateQuotaConnection(): Promise<{
  enabled: boolean;
  connected: boolean;
  latencyMs: number;
  reason?: string;
}> {
  const enabled = isQuotaTrackingEnabled();

  if (!enabled) {
    const reason = !process.env.REDIS_URL
      ? "REDIS_URL not set"
      : process.env.QUOTA_ENFORCEMENT_ENABLED === "false"
        ? "QUOTA_ENFORCEMENT_ENABLED=false"
        : "Not in production (set QUOTA_ENFORCEMENT_ENABLED=true to enable)";

    logger.info("Quota tracking disabled", { api: "quota", reason });
    return { enabled: false, connected: false, latencyMs: 0, reason };
  }

  const client = getRedisClient();
  if (!client) {
    return {
      enabled: true,
      connected: false,
      latencyMs: 0,
      reason: "Redis client creation failed",
    };
  }

  try {
    const start = Date.now();
    await client.ping();
    const latencyMs = Date.now() - start;

    logger.info("Quota tracking enabled", {
      api: "quota",
      protocol: "TCP",
      latencyMs,
    });

    return { enabled: true, connected: true, latencyMs };
  } catch (error) {
    return {
      enabled: true,
      connected: false,
      latencyMs: 0,
      reason: error instanceof Error ? error.message : "Connection failed",
    };
  }
}
