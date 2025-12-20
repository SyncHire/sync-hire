/**
 * Storage Provider Factory
 *
 * Creates the appropriate cloud storage provider based on environment configuration.
 * Uses GCS in production, local filesystem in development.
 */

import { singleton } from "@/lib/utils/singleton";
import { gcsClient } from "../gcs-client";
import { storageConfig } from "../storage-config";
import type { CloudStorageProvider } from "./cloud-storage-provider";
import { GCSStorageProvider } from "./gcs-storage-provider";
import { LocalStorageProvider } from "./local-storage-provider";

function createCloudStorageProvider(): CloudStorageProvider {
  if (storageConfig.useCloudStorage) {
    return new GCSStorageProvider(gcsClient);
  }
  return new LocalStorageProvider();
}

/**
 * Get the singleton cloud storage provider instance
 *
 * Uses environment variable USE_CLOUD_STORAGE to determine which provider to use:
 * - "true": GCP Cloud Storage (for production)
 * - "false" or unset: Local filesystem (for development)
 */
export const getCloudStorageProvider = singleton(createCloudStorageProvider);
