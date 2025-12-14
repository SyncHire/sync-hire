import * as Sentry from '@sentry/nextjs';

/**
 * Next.js Instrumentation
 *
 * This file runs once when the Next.js server starts.
 * Used for server-side initialization like Sentry and database connection validation.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');

    // Validate database connection when database mode is enabled
    if (process.env.USE_DATABASE === 'true') {
      const { validateDatabaseConnection } = await import('@sync-hire/database');

      try {
        await validateDatabaseConnection();
      } catch (error) {
        console.error('Server startup aborted: Database connection failed');
        // In production, you may want to exit the process
        // process.exit(1);
      }
    }
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}

export const onRequestError = Sentry.captureRequestError;
