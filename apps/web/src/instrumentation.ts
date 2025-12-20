/**
 * Next.js Instrumentation
 *
 * This file runs once when the Next.js server starts.
 * Used for server-side initialization like Sentry and database connection validation.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

import { isSentryEnabled } from "./lib/sentry.config";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    if (isSentryEnabled) {
      await import("../sentry.server.config");
    }

    // Validate database connection when database mode is enabled
    if (process.env.USE_DATABASE === "true") {
      const { validateDatabaseConnection } = await import(
        "@sync-hire/database"
      );

      try {
        await validateDatabaseConnection();
      } catch (error) {
        if (isSentryEnabled) {
          const Sentry = await import("@sentry/nextjs");
          Sentry.captureException(error);
        }

        if (process.env.NODE_ENV === "production") {
          process.exit(1);
        } else {
        }
      }
    }

    // Validate rate limit connection (non-blocking - just logs status)
    const { validateRateLimitConnection } = await import("./lib/rate-limiter");
    await validateRateLimitConnection();
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    if (isSentryEnabled) {
      await import("../sentry.edge.config");
    }
  }
}

export async function onRequestError(
  ...args: Parameters<typeof import("@sentry/nextjs").captureRequestError>
) {
  if (isSentryEnabled) {
    const Sentry = await import("@sentry/nextjs");
    return Sentry.captureRequestError(...args);
  }
}
