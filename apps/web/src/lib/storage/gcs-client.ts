/**
 * GCS Client Singleton
 *
 * Centralizes Google Cloud Storage initialization following Next.js best practices.
 * Uses globalThis pattern to preserve instance across hot reloads in development
 * and across warm starts in serverless production environment.
 *
 * @see https://www.prisma.io/docs/orm/more/help-and-troubleshooting/help-articles/nextjs-prisma-client-dev-practices
 */

import { Storage } from "@google-cloud/storage";

declare global {
  var __gcsClient: Storage | undefined;
}

const globalForGCS = globalThis as typeof globalThis & {
  __gcsClient: Storage | undefined;
};

/**
 * Initialize GCS client as a singleton
 * Reused across requests in warm serverless containers
 * Persisted across hot reloads in development
 *
 * Credentials are loaded automatically from:
 * - GOOGLE_APPLICATION_CREDENTIALS environment variable (path to service account JSON)
 * - GCP metadata server (when running on GCP infrastructure)
 * - Application Default Credentials
 */
export const gcsClient =
  globalForGCS.__gcsClient ??
  new Storage({
    projectId: process.env.GCP_PROJECT_ID,
  });

// Preserve instance in development for hot reload support
if (process.env.NODE_ENV !== "production") {
  globalForGCS.__gcsClient = gcsClient;
}
