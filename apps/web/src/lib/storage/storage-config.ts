/**
 * Storage Configuration
 *
 * Centralized config for storage providers.
 * All storage-related environment variables are defined here.
 */

export const storageConfig = {
  /** Use GCP Cloud Storage (true) or local filesystem (false) */
  useCloudStorage: process.env.USE_CLOUD_STORAGE === "true",

  /** GCS bucket name for file uploads */
  gcsBucket: process.env.GCS_BUCKET ?? "synchire-uploads",

  /** Local storage directory (when not using cloud storage) */
  localStorageDir: process.env.LOCAL_STORAGE_DIR ?? ".storage",
} as const;
