/**
 * Storage Provider Factory
 *
 * Creates the appropriate cloud storage provider based on environment configuration.
 * Uses GCS in production, local filesystem in development.
 */

import type { CloudStorageProvider } from "./cloud-storage-provider";
import { GCSStorageProvider } from "./gcs-storage-provider";
import { LocalStorageProvider } from "./local-storage-provider";

let cachedProvider: CloudStorageProvider | null = null;

/**
 * Create a cloud storage provider instance
 *
 * Uses environment variable USE_CLOUD_STORAGE to determine which provider to use:
 * - "true": GCP Cloud Storage (for production)
 * - "false" or unset: Local filesystem (for development)
 *
 * The provider is cached for performance.
 */
export function createStorageProvider(): CloudStorageProvider {
  if (cachedProvider) {
    return cachedProvider;
  }

  const useCloudStorage = process.env.USE_CLOUD_STORAGE === "true";

  if (useCloudStorage) {
    console.log("[Storage] Using GCP Cloud Storage");
    cachedProvider = new GCSStorageProvider();
  } else {
    console.log("[Storage] Using local file storage (development mode)");
    cachedProvider = new LocalStorageProvider();
  }

  return cachedProvider;
}

/**
 * Get the bucket name for CV uploads
 */
export function getCVBucket(): string {
  return process.env.GCS_BUCKET_CV ?? "synchire-cvs";
}

/**
 * Get the bucket name for Job Description uploads
 */
export function getJDBucket(): string {
  return process.env.GCS_BUCKET_JD ?? "synchire-job-descriptions";
}
