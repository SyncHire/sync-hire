/**
 * Environment Test Fixtures
 *
 * Utilities for managing environment variables in tests.
 */

/** Type-safe environment variable setter */
export function setEnv(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete (process.env as Record<string, string | undefined>)[key];
  } else {
    (process.env as Record<string, string | undefined>)[key] = value;
  }
}

/** Environment keys commonly modified in tests */
const ENV_KEYS = [
  "REDIS_URL",
  "NODE_ENV",
  "REDIS_PREFIX",
  "MEMBERSHIP_CACHE_ENABLED",
] as const;

type EnvSnapshot = Record<(typeof ENV_KEYS)[number], string | undefined>;

/** Capture current environment */
export function captureEnv(): EnvSnapshot {
  const snapshot = {} as EnvSnapshot;
  for (const key of ENV_KEYS) {
    snapshot[key] = process.env[key];
  }
  return snapshot;
}

/** Restore environment from snapshot */
export function restoreEnv(snapshot: EnvSnapshot): void {
  for (const key of ENV_KEYS) {
    setEnv(key, snapshot[key]);
  }
}

/** Configure memory cache mode (Redis disabled) */
export function useMemoryCache(): void {
  setEnv("REDIS_URL", undefined);
  setEnv("NODE_ENV", "development");
}

/** Configure Redis cache mode */
export function useRedisCache(prefix = "test"): void {
  setEnv("REDIS_URL", "redis://localhost:6379");
  setEnv("NODE_ENV", "production");
  setEnv("REDIS_PREFIX", prefix);
}
