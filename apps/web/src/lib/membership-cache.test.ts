/**
 * Tests for membership-cache.ts
 *
 * Security-critical tests for Redis/memory caching, expiration,
 * invalidation, and graceful degradation.
 */

import {
  captureEnv,
  restoreEnv,
  setEnv,
  useMemoryCache,
  useRedisCache,
} from "@test/fixtures/env";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Capture original env before mocks are set up
const originalEnv = captureEnv();

// Mock Redis
const mockRedis = {
  get: vi.fn(),
  setex: vi.fn(),
  del: vi.fn(),
  keys: vi.fn(),
};

class MockRedis {
  get = mockRedis.get;
  setex = mockRedis.setex;
  del = mockRedis.del;
  keys = mockRedis.keys;
}

vi.mock("ioredis", () => ({ default: MockRedis }));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

describe("membership-cache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => restoreEnv(originalEnv));

  // ===========================================================================
  // Memory Cache Mode
  // ===========================================================================
  describe("Memory Cache Mode", () => {
    beforeEach(() => useMemoryCache());

    it("returns null when no cache exists", async () => {
      const { getCachedMembership } = await import("./membership-cache");
      expect(await getCachedMembership("user-1", "org-1")).toBeNull();
    });

    it("returns cached role after set", async () => {
      const { getCachedMembership, setCachedMembership } = await import(
        "./membership-cache"
      );
      await setCachedMembership("user-1", "org-1", "admin");
      expect(await getCachedMembership("user-1", "org-1")).toBe("admin");
    });

    it("returns null for expired entries", async () => {
      const { getCachedMembership, setCachedMembership } = await import(
        "./membership-cache"
      );
      const now = Date.now();
      const dateSpy = vi.spyOn(Date, "now");

      dateSpy.mockReturnValue(now);
      await setCachedMembership("user-1", "org-1", "member");

      dateSpy.mockReturnValue(now + 3 * 60 * 1000 + 1); // Past TTL
      expect(await getCachedMembership("user-1", "org-1")).toBeNull();
      dateSpy.mockRestore();
    });

    it("returns cached value within TTL", async () => {
      const { getCachedMembership, setCachedMembership } = await import(
        "./membership-cache"
      );
      const now = Date.now();
      const dateSpy = vi.spyOn(Date, "now");

      dateSpy.mockReturnValue(now);
      await setCachedMembership("user-1", "org-1", "owner");

      dateSpy.mockReturnValue(now + 3 * 60 * 1000 - 1000); // Before TTL
      expect(await getCachedMembership("user-1", "org-1")).toBe("owner");
      dateSpy.mockRestore();
    });

    it("isolates entries by user and org", async () => {
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

    it("invalidates specific user-org entry", async () => {
      const { getCachedMembership, setCachedMembership, invalidateMembership } =
        await import("./membership-cache");

      await setCachedMembership("user-1", "org-1", "admin");
      await setCachedMembership("user-1", "org-2", "member");
      await invalidateMembership("user-1", "org-1");

      expect(await getCachedMembership("user-1", "org-1")).toBeNull();
      expect(await getCachedMembership("user-1", "org-2")).toBe("member");
    });

    it("invalidates all entries for a user when no orgId", async () => {
      const { getCachedMembership, setCachedMembership, invalidateMembership } =
        await import("./membership-cache");

      await setCachedMembership("user-1", "org-1", "admin");
      await setCachedMembership("user-1", "org-2", "member");
      await setCachedMembership("user-2", "org-1", "owner");
      await invalidateMembership("user-1");

      expect(await getCachedMembership("user-1", "org-1")).toBeNull();
      expect(await getCachedMembership("user-1", "org-2")).toBeNull();
      expect(await getCachedMembership("user-2", "org-1")).toBe("owner");
    });

    it("invalidates all entries for an organization", async () => {
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
      expect(await getCachedMembership("user-1", "org-2")).toBe("owner");
    });
  });

  // ===========================================================================
  // Redis Cache Mode
  // ===========================================================================
  describe("Redis Cache Mode", () => {
    beforeEach(() => useRedisCache());

    it("returns cached role from Redis", async () => {
      mockRedis.get.mockResolvedValueOnce(
        JSON.stringify({ role: "admin", cachedAt: Date.now() }),
      );
      const { getCachedMembership } = await import("./membership-cache");

      expect(await getCachedMembership("user-1", "org-1")).toBe("admin");
      expect(mockRedis.get).toHaveBeenCalledWith(
        "test:membership:user-1:org-1",
      );
    });

    it("returns null when Redis has no cache", async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      const { getCachedMembership } = await import("./membership-cache");
      expect(await getCachedMembership("user-1", "org-1")).toBeNull();
    });

    it("falls back to memory cache when Redis fails", async () => {
      mockRedis.get.mockRejectedValueOnce(new Error("Connection failed"));
      const { getCachedMembership } = await import("./membership-cache");
      expect(await getCachedMembership("user-1", "org-1")).toBeNull();
    });

    it("stores membership in Redis with TTL", async () => {
      mockRedis.setex.mockResolvedValueOnce("OK");
      const { setCachedMembership } = await import("./membership-cache");

      await setCachedMembership("user-1", "org-1", "member");

      expect(mockRedis.setex).toHaveBeenCalledWith(
        "test:membership:user-1:org-1",
        180,
        expect.stringContaining('"role":"member"'),
      );
    });

    it("falls back to memory when Redis set fails", async () => {
      mockRedis.setex.mockRejectedValueOnce(new Error("Write failed"));
      mockRedis.get.mockRejectedValueOnce(new Error("Read failed"));
      const { setCachedMembership, getCachedMembership } = await import(
        "./membership-cache"
      );

      await setCachedMembership("user-1", "org-1", "admin");
      expect(await getCachedMembership("user-1", "org-1")).toBe("admin");
    });

    it("deletes specific key from Redis", async () => {
      mockRedis.del.mockResolvedValueOnce(1);
      const { invalidateMembership } = await import("./membership-cache");

      await invalidateMembership("user-1", "org-1");
      expect(mockRedis.del).toHaveBeenCalledWith(
        "test:membership:user-1:org-1",
      );
    });

    it("deletes all user keys from Redis when no orgId", async () => {
      mockRedis.keys.mockResolvedValueOnce([
        "test:membership:user-1:org-1",
        "test:membership:user-1:org-2",
      ]);
      mockRedis.del.mockResolvedValueOnce(2);
      const { invalidateMembership } = await import("./membership-cache");

      await invalidateMembership("user-1");

      expect(mockRedis.keys).toHaveBeenCalledWith("test:membership:user-1:*");
      expect(mockRedis.del).toHaveBeenCalledWith(
        "test:membership:user-1:org-1",
        "test:membership:user-1:org-2",
      );
    });

    it("handles empty keys result gracefully", async () => {
      mockRedis.keys.mockResolvedValueOnce([]);
      const { invalidateMembership } = await import("./membership-cache");

      await invalidateMembership("user-1");
      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it("does not throw when Redis delete fails", async () => {
      mockRedis.del.mockRejectedValueOnce(new Error("Delete failed"));
      const { invalidateMembership } = await import("./membership-cache");
      await expect(
        invalidateMembership("user-1", "org-1"),
      ).resolves.toBeUndefined();
    });

    it("deletes all org keys from Redis", async () => {
      mockRedis.keys.mockResolvedValueOnce([
        "test:membership:user-1:org-1",
        "test:membership:user-2:org-1",
      ]);
      mockRedis.del.mockResolvedValueOnce(2);
      const { invalidateOrganizationMemberships } = await import(
        "./membership-cache"
      );

      await invalidateOrganizationMemberships("org-1");

      expect(mockRedis.keys).toHaveBeenCalledWith("test:membership:*:org-1");
      expect(mockRedis.del).toHaveBeenCalledWith(
        "test:membership:user-1:org-1",
        "test:membership:user-2:org-1",
      );
    });
  });

  // ===========================================================================
  // Cache Configuration
  // ===========================================================================
  describe("Cache Configuration", () => {
    it("uses Redis in production", async () => {
      useRedisCache();
      mockRedis.get.mockResolvedValueOnce(null);
      const { getCachedMembership } = await import("./membership-cache");

      await getCachedMembership("user-1", "org-1");
      expect(mockRedis.get).toHaveBeenCalled();
    });

    it("uses memory cache in development", async () => {
      setEnv("REDIS_URL", "redis://localhost:6379");
      setEnv("NODE_ENV", "development");
      setEnv("MEMBERSHIP_CACHE_ENABLED", undefined);
      const { setCachedMembership, getCachedMembership } = await import(
        "./membership-cache"
      );

      await setCachedMembership("user-1", "org-1", "admin");
      await getCachedMembership("user-1", "org-1");

      expect(mockRedis.get).not.toHaveBeenCalled();
      expect(mockRedis.setex).not.toHaveBeenCalled();
    });

    it("uses Redis in development when force enabled", async () => {
      setEnv("REDIS_URL", "redis://localhost:6379");
      setEnv("NODE_ENV", "development");
      setEnv("MEMBERSHIP_CACHE_ENABLED", "true");
      mockRedis.setex.mockResolvedValueOnce("OK");
      const { setCachedMembership } = await import("./membership-cache");

      await setCachedMembership("user-1", "org-1", "admin");
      expect(mockRedis.setex).toHaveBeenCalled();
    });

    it("uses memory when MEMBERSHIP_CACHE_ENABLED=false", async () => {
      setEnv("REDIS_URL", "redis://localhost:6379");
      setEnv("NODE_ENV", "production");
      setEnv("MEMBERSHIP_CACHE_ENABLED", "false");
      const { setCachedMembership, getCachedMembership } = await import(
        "./membership-cache"
      );

      await setCachedMembership("user-1", "org-1", "admin");
      expect(await getCachedMembership("user-1", "org-1")).toBe("admin");
      expect(mockRedis.get).not.toHaveBeenCalled();
    });

    it("uses default prefix when REDIS_PREFIX not set", async () => {
      setEnv("REDIS_URL", "redis://localhost:6379");
      setEnv("NODE_ENV", "production");
      setEnv("REDIS_PREFIX", undefined);
      mockRedis.get.mockResolvedValueOnce(null);
      const { getCachedMembership } = await import("./membership-cache");

      await getCachedMembership("user-1", "org-1");
      expect(mockRedis.get).toHaveBeenCalledWith(
        "synchire:membership:user-1:org-1",
      );
    });
  });

  // ===========================================================================
  // Security
  // ===========================================================================
  describe("Security", () => {
    beforeEach(() => useMemoryCache());

    it("does not leak data between users", async () => {
      const { getCachedMembership, setCachedMembership } = await import(
        "./membership-cache"
      );
      await setCachedMembership("user-a", "org-1", "owner");
      expect(await getCachedMembership("user-b", "org-1")).toBeNull();
    });

    it("does not leak data between organizations", async () => {
      const { getCachedMembership, setCachedMembership } = await import(
        "./membership-cache"
      );
      await setCachedMembership("user-1", "org-a", "admin");
      expect(await getCachedMembership("user-1", "org-b")).toBeNull();
    });

    it("invalidates without affecting other entries", async () => {
      const { getCachedMembership, setCachedMembership, invalidateMembership } =
        await import("./membership-cache");

      await setCachedMembership("user-1", "org-1", "admin");
      await setCachedMembership("user-1", "org-2", "member");
      await setCachedMembership("user-2", "org-1", "owner");
      await invalidateMembership("user-1", "org-1");

      expect(await getCachedMembership("user-1", "org-1")).toBeNull();
      expect(await getCachedMembership("user-1", "org-2")).toBe("member");
      expect(await getCachedMembership("user-2", "org-1")).toBe("owner");
    });
  });
});
