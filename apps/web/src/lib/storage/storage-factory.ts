/**
 * Storage Factory
 *
 * Creates the appropriate storage implementation based on configuration.
 * Makes it easy to swap between file and database storage.
 */

import { FileStorage } from "./file-storage";
import type { StorageInterface } from "./storage-interface";

export function createStorage(): StorageInterface {
  // In the future, this can check for environment variables
  // to determine whether to use database or file storage
  const useDatabase = process.env.USE_DATABASE === "true";

  if (useDatabase) {
    // Future: return new DatabaseStorage();
    console.warn(
      "DATABASE_STORAGE not yet implemented, falling back to FileStorage",
    );
  }

  return new FileStorage();
}

// Default singleton instance
let storageInstance: StorageInterface | null = null;

export function getStorage(): StorageInterface {
  if (!storageInstance) {
    storageInstance = createStorage();
  }
  return storageInstance;
}
