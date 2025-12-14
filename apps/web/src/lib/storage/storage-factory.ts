/**
 * Storage Factory
 *
 * Creates the appropriate storage implementation based on configuration.
 * Uses constructor injection for dependencies.
 */

import { DatabaseStorage } from "./database-storage";
import { FileStorage } from "./file-storage";
import { createStorageProvider } from "./cloud/storage-provider-factory";
import type { StorageInterface } from "./storage-interface";

export function createStorage(): StorageInterface {
  const useDatabase = process.env.USE_DATABASE === "true";

  if (useDatabase) {
    const cloudStorage = createStorageProvider();
    console.log("Using DatabaseStorage (Prisma + PostgreSQL)");
    return new DatabaseStorage(cloudStorage);
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
