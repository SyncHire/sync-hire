/**
 * Tests for membership-cache.ts
 *
 * Security-critical tests for membership caching system.
 * Covers:
 * - Redis cache operations
 * - Memory cache fallback
 * - Cache expiration
 * - Cache invalidation (user and organization level)
 * - Graceful degradation when Redis fails
 */

import type { OrgMemberRole } from "@sync-hire/database";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from "vitest";

// Helper to set environment variables with proper typing
function setEnv(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete (process.env as Record<string, string | undefined>)[key];
  } else {
    (process.env as Record<string, string | undefined>)[key] = value;
  }
}

// Store original env values we'll modify
const originalEnv = {
  REDIS_URL: process.env.REDIS_URL,
  NODE_ENV: process.env.NODE_ENV,
  REDIS_PREFIX: process.env.REDIS_PREFIX,
  MEMBERSHIP_CACHE_ENABLED: process.env.MEMBERSHIP_CACHE_ENABLED,
};

// Mock Redis client methods
const mockRedisGet = vi.fn();
const mockRedisSetex = vi.fn();
const mockRedisDel = vi.fn();
const mockRedisKeys = vi.fn();

// Create a mock Redis class
class MockRedis {
  get = mockRedisGet;
  setex = mockRedisSetex;
  del = mockRedisDel;
  keys = mockRedisKeys;
}

vi.mock("ioredis", () => {
  return {
    default: MockRedis,
  };
});

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("membership-cache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset module to clear singleton and memory cache
    vi.resetModules();
  });

  afterEach(() => {
    // Restore original environment
    setEnv("REDIS_URL", originalEnv.REDIS_URL);
    setEnv("NODE_ENV", originalEnv.NODE_ENV);
    setEnv("REDIS_PREFIX", originalEnv.REDIS_PREFIX);
    setEnv("MEMBERSHIP_CACHE_ENABLED", originalEnv.MEMBERSHIP_CACHE_ENABLED);
  });

  // ===========================================================================
  // Memory Cache Mode (Redis disabled)
  // ===========================================================================
  describe("Memory Cache Mode", () => {
    beforeEach(() => {
      // Disable Redis by not setting REDIS_URL
      setEnv("REDIS_URL", undefined);
      setEnv("NODE_ENV", "development");
    });

    describe("getCachedMembership", () => {
      it("should return null when no cache exists", async () => {
        const { getCachedMembership } = await import("./membership-cache");

        const result = await getCachedMembership("user-1", "org-1");

        expect(result).toBeNull();
      });

      it("should return cached role after setCachedMembership", async () => {
        const { getCachedMembership, setCachedMembership } = await import(
          "./membership-cache"
        );

        await setCachedMembership("user-1", "org-1", "admin");
        const result = await getCachedMembership("user-1", "org-1");

        expect(result).toBe("admin");
      });

      it("should return null for expired cache entries", async () => {
        const { getCachedMembership, setCachedMembership } = await import(
          "./membership-cache"
        );

        // Mock Date.now to simulate time passing
        const now = Date.now();
        const dateSpy = vi.spyOn(Date, "now");

        // Set cache at time 0
        dateSpy.mockReturnValue(now);
        await setCachedMembership("user-1", "org-1", "member");

        // Advance time past TTL (3 minutes + 1ms)
        dateSpy.mockReturnValue(now + 3 * 60 * 1000 + 1);
        const result = await getCachedMembership("user-1", "org-1");

        expect(result).toBeNull();
        dateSpy.mockRestore();
      });

      it("should return cached value within TTL", async () => {
        const { getCachedMembership, setCachedMembership } = await import(
          "./membership-cache"
        );

        const now = Date.now();
        const dateSpy = vi.spyOn(Date, "now");

        // Set cache
        dateSpy.mockReturnValue(now);
        await setCachedMembership("user-1", "org-1", "owner");

        // Check just before expiry (3 minutes - 1 second)
        dateSpy.mockReturnValue(now + 3 * 60 * 1000 - 1000);
        const result = await getCachedMembership("user-1", "org-1");

        expect(result).toBe("owner");
        dateSpy.mockRestore();
      });

      it("should isolate cache entries by user and org", async () => {
        const { getCachedMembership, setCachedMembership } = await import(
          "./membership-cache"
        );

        await setCachedMembership("user-1", "org-1", "admin");
        await setCachedMembership("user-1", "org-2", "member");
        await setCachedMembership("user-2", "org-1", "owner");

        expect(await getCachedMembership("user-1", "org-1")).toBe("admin");
        expect(await getCachedMembership("user-1", "org-2")).toBe("member");
        expect(await getCachedMembership("user-2", "org-1")).toBe("owner");
        expect(await getCachedMembership("user-2", "org-2")).toBeNull();
      });
    });

    describe("invalidateMembership", () => {
      it("should invalidate specific user-org cache entry", async () => {
        const {
          getCachedMembership,
          setCachedMembership,
          invalidateMembership,
        } = await import("./membership-cache");

        await setCachedMembership("user-1", "org-1", "admin");
        await setCachedMembership("user-1", "org-2", "member");

        await invalidateMembership("user-1", "org-1");

        expect(await getCachedMembership("user-1", "org-1")).toBeNull();
        expect(await getCachedMembership("user-1", "org-2")).toBe("member");
      });

      it("should invalidate all cache entries for a user when no orgId provided", async () => {
        const {
          getCachedMembership,
          setCachedMembership,
          invalidateMembership,
        } = await import("./membership-cache");

        await setCachedMembership("user-1", "org-1", "admin");
        await setCachedMembership("user-1", "org-2", "member");
        await setCachedMembership("user-2", "org-1", "owner");

        await invalidateMembership("user-1");

        expect(await getCachedMembership("user-1", "org-1")).toBeNull();
        expect(await getCachedMembership("user-1", "org-2")).toBeNull();
        // Other user's cache should remain
        expect(await getCachedMembership("user-2", "org-1")).toBe("owner");
      });
    });

    describe("invalidateOrganizationMemberships", () => {
      it("should invalidate all cache entries for an organization", async () => {
        const {
          getCachedMembership,
          setCachedMembership,
          invalidateOrganizationMemberships,
        } = await import("./membership-cache");

        await setCachedMembership("user-1", "org-1", "admin");
        await setCachedMembership("user-2", "org-1", "member");
        await setCachedMembership("user-1", "org-2", "owner");

        await invalidateOrganizationMemberships("org-1");

        expect(await getCachedMembership("user-1", "org-1")).toBeNull();
        expect(await getCachedMembership("user-2", "org-1")).toBeNull();
        // Other org's cache should remain
        expect(await getCachedMembership("user-1", "org-2")).toBe("owner");
      });
    });
  });

  // ===========================================================================
  // Redis Cache Mode
  // ===========================================================================
  describe("Redis Cache Mode", () => {
    beforeEach(() => {
      setEnv("REDIS_URL", "redis://localhost:6379");
      setEnv("NODE_ENV", "production");
      setEnv("REDIS_PREFIX", "test");
    });

    describe("getCachedMembership", () => {
      it("should return cached role from Redis", async () => {
        const cachedValue = JSON.stringify({
          role: "admin" as OrgMemberRole,
          cachedAt: Date.now(),
        });
        mockRedisGet.mockResolvedValueOnce(cachedValue);

        const { getCachedMembership } = await import("./membership-cache");
        const result = await getCachedMembership("user-1", "org-1");

        expect(result).toBe("admin");
        expect(mockRedisGet).toHaveBeenCalledWith("test:membership:user-1:org-1");
      });

      it("should return null when Redis has no cache", async () => {
        mockRedisGet.mockResolvedValueOnce(null);

        const { getCachedMembership } = await import("./membership-cache");
        const result = await getCachedMembership("user-1", "org-1");

        expect(result).toBeNull();
      });

      it("should fall back to memory cache when Redis fails", async () => {
        mockRedisGet.mockRejectedValueOnce(new Error("Redis connection failed"));

        const { getCachedMembership } = await import("./membership-cache");
        const result = await getCachedMembership("user-1", "org-1");

        // Should return null (no memory cache set yet) but not throw
        expect(result).toBeNull();
      });
    });

    describe("setCachedMembership", () => {
      it("should store membership in Redis with TTL", async () => {
        mockRedisSetex.mockResolvedValueOnce("OK");

        const { setCachedMembership } = await import("./membership-cache");
        await setCachedMembership("user-1", "org-1", "member");

        expect(mockRedisSetex).toHaveBeenCalledWith(
          "test:membership:user-1:org-1",
          180, // 3 minutes in seconds
          expect.stringContaining('"role":"member"'),
        );
      });

      it("should fall back to memory cache when Redis set fails", async () => {
        mockRedisSetex.mockRejectedValueOnce(new Error("Redis write failed"));
        // For the get, also fail Redis so we use memory
        mockRedisGet.mockRejectedValueOnce(new Error("Redis read failed"));

        const { setCachedMembership, getCachedMembership } = await import(
          "./membership-cache"
        );

        // Should not throw
        await setCachedMembership("user-1", "org-1", "admin");

        // Should have cached in memory
        const result = await getCachedMembership("user-1", "org-1");
        expect(result).toBe("admin");
      });
    });

    describe("invalidateMembership", () => {
      it("should delete specific key from Redis", async () => {
        mockRedisDel.mockResolvedValueOnce(1);

        const { invalidateMembership } = await import("./membership-cache");
        await invalidateMembership("user-1", "org-1");

        expect(mockRedisDel).toHaveBeenCalledWith("test:membership:user-1:org-1");
      });

      it("should delete all user keys from Redis when no orgId", async () => {
        mockRedisKeys.mockResolvedValueOnce([
          "test:membership:user-1:org-1",
          "test:membership:user-1:org-2",
        ]);
        mockRedisDel.mockResolvedValueOnce(2);

        const { invalidateMembership } = await import("./membership-cache");
        await invalidateMembership("user-1");

        expect(mockRedisKeys).toHaveBeenCalledWith("test:membership:user-1:*");
        expect(mockRedisDel).toHaveBeenCalledWith(
          "test:membership:user-1:org-1",
          "test:membership:user-1:org-2",
        );
      });

      it("should handle empty keys result gracefully", async () => {
        mockRedisKeys.mockResolvedValueOnce([]);

        const { invalidateMembership } = await import("./membership-cache");
        await invalidateMembership("user-1");

        expect(mockRedisKeys).toHaveBeenCalled();
        expect(mockRedisDel).not.toHaveBeenCalled();
      });

      it("should not throw when Redis delete fails", async () => {
        mockRedisDel.mockRejectedValueOnce(new Error("Redis delete failed"));

        const { invalidateMembership } = await import("./membership-cache");

        // Should not throw
        await expect(
          invalidateMembership("user-1", "org-1"),
        ).resolves.toBeUndefined();
      });
    });

    describe("invalidateOrganizationMemberships", () => {
      it("should delete all org keys from Redis", async () => {
        mockRedisKeys.mockResolvedValueOnce([
          "test:membership:user-1:org-1",
          "test:membership:user-2:org-1",
        ]);
        mockRedisDel.mockResolvedValueOnce(2);

        const { invalidateOrganizationMemberships } = await import(
          "./membership-cache"
        );
        await invalidateOrganizationMemberships("org-1");

        expect(mockRedisKeys).toHaveBeenCalledWith("test:membership:*:org-1");
        expect(mockRedisDel).toHaveBeenCalledWith(
          "test:membership:user-1:org-1",
          "test:membership:user-2:org-1",
        );
      });

      it("should not throw when Redis pattern delete fails", async () => {
        mockRedisKeys.mockRejectedValueOnce(new Error("Redis keys failed"));

        const { invalidateOrganizationMemberships } = await import(
          "./membership-cache"
        );

        // Should not throw
        await expect(
          invalidateOrganizationMemberships("org-1"),
        ).resolves.toBeUndefined();
      });
    });
  });

  // ===========================================================================
  // Cache Configuration
  // ===========================================================================
  describe("Cache Configuration", () => {
    it("should use Redis in production when REDIS_URL is set", async () => {
      setEnv("REDIS_URL", "redis://localhost:6379");
      setEnv("NODE_ENV", "production");

      mockRedisGet.mockResolvedValueOnce(null);

      const { getCachedMembership } = await import("./membership-cache");
      await getCachedMembership("user-1", "org-1");

      expect(mockRedisGet).toHaveBeenCalled();
    });

    it("should use memory cache in development without force enable", async () => {
      setEnv("REDIS_URL", "redis://localhost:6379");
      setEnv("NODE_ENV", "development");
      setEnv("MEMBERSHIP_CACHE_ENABLED", undefined);

      const { getCachedMembership, setCachedMembership } = await import(
        "./membership-cache"
      );

      await setCachedMembership("user-1", "org-1", "admin");
      await getCachedMembership("user-1", "org-1");

      // Redis should not be called in development mode
      expect(mockRedisGet).not.toHaveBeenCalled();
      expect(mockRedisSetex).not.toHaveBeenCalled();
    });

    it("should use Redis in development when force enabled", async () => {
      setEnv("REDIS_URL", "redis://localhost:6379");
      setEnv("NODE_ENV", "development");
      setEnv("MEMBERSHIP_CACHE_ENABLED", "true");

      mockRedisSetex.mockResolvedValueOnce("OK");

      const { setCachedMembership } = await import("./membership-cache");
      await setCachedMembership("user-1", "org-1", "admin");

      expect(mockRedisSetex).toHaveBeenCalled();
    });

    it("should disable cache when MEMBERSHIP_CACHE_ENABLED is false", async () => {
      setEnv("REDIS_URL", "redis://localhost:6379");
      setEnv("NODE_ENV", "production");
      setEnv("MEMBERSHIP_CACHE_ENABLED", "false");

      const { getCachedMembership, setCachedMembership } = await import(
        "./membership-cache"
      );

      await setCachedMembership("user-1", "org-1", "admin");
      const result = await getCachedMembership("user-1", "org-1");

      // Should use memory cache, not Redis
      expect(mockRedisGet).not.toHaveBeenCalled();
      expect(mockRedisSetex).not.toHaveBeenCalled();
      // But memory cache should still work
      expect(result).toBe("admin");
    });

    it("should use default prefix when REDIS_PREFIX not set", async () => {
      setEnv("REDIS_URL", "redis://localhost:6379");
      setEnv("NODE_ENV", "production");
      setEnv("REDIS_PREFIX", undefined);

      mockRedisGet.mockResolvedValueOnce(null);

      const { getCachedMembership } = await import("./membership-cache");
      await getCachedMembership("user-1", "org-1");

      expect(mockRedisGet).toHaveBeenCalledWith(
        "synchire:membership:user-1:org-1",
      );
    });
  });

  // ===========================================================================
  // Security Tests
  // ===========================================================================
  describe("Security", () => {
    beforeEach(() => {
      setEnv("REDIS_URL", undefined);
      setEnv("NODE_ENV", "development");
    });

    it("should not leak membership data between different users", async () => {
      const { getCachedMembership, setCachedMembership } = await import(
        "./membership-cache"
      );

      await setCachedMembership("user-a", "org-1", "owner");

      // User B should not see User A's membership
      const result = await getCachedMembership("user-b", "org-1");
      expect(result).toBeNull();
    });

    it("should not leak membership data between different organizations", async () => {
      const { getCachedMembership, setCachedMembership } = await import(
        "./membership-cache"
      );

      await setCachedMembership("user-1", "org-a", "admin");

      // Same user, different org should not see the membership
      const result = await getCachedMembership("user-1", "org-b");
      expect(result).toBeNull();
    });

    it("should properly invalidate without affecting other entries", async () => {
      const {
        getCachedMembership,
        setCachedMembership,
        invalidateMembership,
      } = await import("./membership-cache");

      // Set up multiple entries
      await setCachedMembership("user-1", "org-1", "admin");
      await setCachedMembership("user-1", "org-2", "member");
      await setCachedMembership("user-2", "org-1", "owner");

      // Invalidate one specific entry
      await invalidateMembership("user-1", "org-1");

      // Verify only that entry is invalidated
      expect(await getCachedMembership("user-1", "org-1")).toBeNull();
      expect(await getCachedMembership("user-1", "org-2")).toBe("member");
      expect(await getCachedMembership("user-2", "org-1")).toBe("owner");
    });
  });
});
