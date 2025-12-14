import { z } from "zod";

/**
 * Coerce string to number with default fallback
 */
function numberWithDefault(defaultValue: number) {
  return z
    .string()
    .optional()
    .transform((val) => (val ? Number.parseFloat(val) : defaultValue))
    .pipe(z.number().min(0).max(1));
}

/**
 * Coerce string to boolean with default fallback
 */
function booleanWithDefault(defaultValue: boolean) {
  return z
    .string()
    .optional()
    .transform((val) => {
      if (val === undefined) {
        return defaultValue;
      }
      return val === "true" || val === "1";
    });
}

/**
 * Sentry environment variables schema
 */
const sentryEnvSchema = z.object({
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  NEXT_PUBLIC_SENTRY_ENABLED: booleanWithDefault(true),
  // Production-level sample rates (can be overridden via env vars)
  SENTRY_TRACES_SAMPLE_RATE: numberWithDefault(0.1), // 10% of transactions
  NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE: numberWithDefault(0.1), // 10% of sessions
  NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE: numberWithDefault(1.0), // 100% of errors
});

/**
 * Parse and validate Sentry env vars
 */
function getSentryEnv() {
  const result = sentryEnvSchema.safeParse({
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    NEXT_PUBLIC_SENTRY_ENABLED: process.env.NEXT_PUBLIC_SENTRY_ENABLED,
    SENTRY_TRACES_SAMPLE_RATE: process.env.SENTRY_TRACES_SAMPLE_RATE,
    NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE:
      process.env.NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE,
    NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE:
      process.env.NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE,
  });

  if (!result.success) {
    console.error("Invalid Sentry environment variables:");
    console.error(result.error.flatten().fieldErrors);
    throw new Error("Invalid Sentry environment variables");
  }

  return result.data;
}

const sentryEnv = getSentryEnv();

/**
 * Whether Sentry is enabled
 */
export const isSentryEnabled = sentryEnv.NEXT_PUBLIC_SENTRY_ENABLED;

/**
 * Base Sentry configuration shared across server, edge, and client
 * DSN is undefined when Sentry is disabled, which prevents Sentry from initializing
 */
export const baseSentryConfig = {
  dsn: isSentryEnabled ? sentryEnv.NEXT_PUBLIC_SENTRY_DSN : undefined,
  tracesSampleRate: sentryEnv.SENTRY_TRACES_SAMPLE_RATE,
  enableLogs: true,
  sendDefaultPii: true,
} as const;

/**
 * Client-specific Sentry configuration (replay sample rates)
 */
export const clientSentryConfig = {
  ...baseSentryConfig,
  replaysSessionSampleRate:
    sentryEnv.NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE,
  replaysOnErrorSampleRate:
    sentryEnv.NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE,
} as const;
