/**
 * Storage Factory
 *
 * Creates the appropriate storage implementation based on configuration.
 * Supports both file-based and database storage.
 */

import { DatabaseStorage } from "./database-storage";
import { FileStorage } from "./file-storage";
import type { StorageInterface } from "./storage-interface";

export function createStorage(): StorageInterface {
  const useDatabase = process.env.USE_DATABASE === "true";

  if (useDatabase) {
    console.log("Using DatabaseStorage (Prisma + PostgreSQL)");
    return new DatabaseStorage();
  }

  console.log("Using FileStorage (local files)");
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
