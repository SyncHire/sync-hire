/**
 * Organization Membership Cache
 *
 * Caches membership verification results in Redis (if available) or in-memory LRU.
 * TTL: 3 minutes - balances freshness with performance.
 *
 * Cache key format: `synchire:membership:{userId}:{orgId}`
 * Cache value: JSON string of { role: OrgMemberRole, cachedAt: number }
 */

import Redis from "ioredis";
import type { OrgMemberRole } from "@sync-hire/database";
import { logger } from "./logger";

interface CachedMembership {
  role: OrgMemberRole;
  cachedAt: number;
}

// Cache configuration
const CACHE_TTL_SECONDS = 3 * 60; // 3 minutes
const CACHE_TTL_MS = CACHE_TTL_SECONDS * 1000;
const MAX_MEMORY_CACHE_SIZE = 1000;
const KEY_PREFIX = process.env.REDIS_PREFIX ?? "synchire";

// In-memory fallback when Redis unavailable
const memoryCache = new Map<string, CachedMembership>();

/**
 * Check if Redis caching is enabled
 */
function isCacheEnabled(): boolean {
  const hasRedis = Boolean(process.env.REDIS_URL);
  const isProduction = process.env.NODE_ENV === "production";
  const forceEnabled = process.env.MEMBERSHIP_CACHE_ENABLED === "true";
  const forceDisabled = process.env.MEMBERSHIP_CACHE_ENABLED === "false";

  if (forceDisabled) {
    return false;
  }

  // Use Redis in production or when force enabled
  // Fall back to memory cache in development
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
    redisClient = isCacheEnabled() ? createRedisClient() : null;
  }
  return redisClient;
}

/**
 * Generate cache key for user-org membership
 */
function getCacheKey(userId: string, orgId: string): string {
  return `${KEY_PREFIX}:membership:${userId}:${orgId}`;
}

/**
 * Clean up stale entries from memory cache (simple LRU-ish cleanup)
 */
function cleanupMemoryCache(): void {
  if (memoryCache.size <= MAX_MEMORY_CACHE_SIZE) {
    return;
  }

  const now = Date.now();
  const entriesToDelete: string[] = [];

  // First pass: remove expired entries
  for (const [key, value] of memoryCache.entries()) {
    if (now - value.cachedAt > CACHE_TTL_MS) {
      entriesToDelete.push(key);
    }
  }

  for (const key of entriesToDelete) {
    memoryCache.delete(key);
  }

  // If still too large, remove oldest entries
  if (memoryCache.size > MAX_MEMORY_CACHE_SIZE) {
    const entries = [...memoryCache.entries()].sort(
      (a, b) => a[1].cachedAt - b[1].cachedAt
    );
    const toRemove = entries.slice(0, memoryCache.size - MAX_MEMORY_CACHE_SIZE);
    for (const [key] of toRemove) {
      memoryCache.delete(key);
    }
  }
}

/**
 * Get cached membership role for a user in an organization
 *
 * @param userId - User ID
 * @param orgId - Organization ID
 * @returns Cached role or null if not cached/expired
 */
export async function getCachedMembership(
  userId: string,
  orgId: string
): Promise<OrgMemberRole | null> {
  const key = getCacheKey(userId, orgId);
  const client = getRedisClient();

  if (client) {
    // Redis path
    try {
      const cached = await client.get(key);
      if (cached) {
        const parsed: CachedMembership = JSON.parse(cached);
        return parsed.role;
      }
      return null;
    } catch (error) {
      logger.warn("Redis cache get failed, falling back to memory", {
        api: "membership-cache",
        operation: "get",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      // Fall through to memory cache
    }
  }

  // Memory cache path (fallback or when Redis disabled)
  const cached = memoryCache.get(key);
  if (cached) {
    const now = Date.now();
    if (now - cached.cachedAt <= CACHE_TTL_MS) {
      return cached.role;
    }
    // Expired - clean up
    memoryCache.delete(key);
  }

  return null;
}

/**
 * Cache membership role for a user in an organization
 *
 * @param userId - User ID
 * @param orgId - Organization ID
 * @param role - The membership role to cache
 */
export async function setCachedMembership(
  userId: string,
  orgId: string,
  role: OrgMemberRole
): Promise<void> {
  const key = getCacheKey(userId, orgId);
  const value: CachedMembership = {
    role,
    cachedAt: Date.now(),
  };

  const client = getRedisClient();

  if (client) {
    // Redis path
    try {
      await client.setex(key, CACHE_TTL_SECONDS, JSON.stringify(value));
      return;
    } catch (error) {
      logger.warn("Redis cache set failed, falling back to memory", {
        api: "membership-cache",
        operation: "set",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      // Fall through to memory cache
    }
  }

  // Memory cache path (fallback or when Redis disabled)
  cleanupMemoryCache();
  memoryCache.set(key, value);
}

/**
 * Invalidate cached membership for a user
 *
 * @param userId - User ID
 * @param orgId - Optional: specific organization. If not provided, invalidates all orgs for user.
 */
export async function invalidateMembership(
  userId: string,
  orgId?: string
): Promise<void> {
  const client = getRedisClient();

  if (orgId) {
    // Invalidate specific user-org membership
    const key = getCacheKey(userId, orgId);

    if (client) {
      try {
        await client.del(key);
      } catch (error) {
        logger.warn("Redis cache invalidate failed", {
          api: "membership-cache",
          operation: "invalidate",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    memoryCache.delete(key);
  } else {
    // Invalidate all memberships for user
    const pattern = `${KEY_PREFIX}:membership:${userId}:*`;

    if (client) {
      try {
        const keys = await client.keys(pattern);
        if (keys.length > 0) {
          await client.del(...keys);
        }
      } catch (error) {
        logger.warn("Redis cache invalidate (pattern) failed", {
          api: "membership-cache",
          operation: "invalidate-pattern",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Memory cache: scan and delete matching keys
    const prefix = `${KEY_PREFIX}:membership:${userId}:`;
    for (const key of memoryCache.keys()) {
      if (key.startsWith(prefix)) {
        memoryCache.delete(key);
      }
    }
  }

  logger.info("Membership cache invalidated", {
    api: "membership-cache",
    operation: "invalidate",
    userId,
    orgId: orgId ?? "all",
  });
}

/**
 * Invalidate all cached memberships for an organization
 * Used when organization is deleted or significant role changes occur
 *
 * @param orgId - Organization ID
 */
export async function invalidateOrganizationMemberships(
  orgId: string
): Promise<void> {
  const client = getRedisClient();
  const pattern = `${KEY_PREFIX}:membership:*:${orgId}`;

  if (client) {
    try {
      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await client.del(...keys);
      }
    } catch (error) {
      logger.warn("Redis cache invalidate (org) failed", {
        api: "membership-cache",
        operation: "invalidate-org",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // Memory cache: scan and delete matching keys
  const suffix = `:${orgId}`;
  for (const key of memoryCache.keys()) {
    if (key.endsWith(suffix)) {
      memoryCache.delete(key);
    }
  }

  logger.info("Organization memberships cache invalidated", {
    api: "membership-cache",
    operation: "invalidate-org",
    orgId,
  });
}
