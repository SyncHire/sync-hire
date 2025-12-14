/**
 * Storage Factory
 *
 * Creates the appropriate storage implementation based on configuration.
 * Uses constructor injection for dependencies.
 */

import { DatabaseStorage } from "./database-storage";
import { FileStorage } from "./file-storage";
import { getCloudStorageProvider } from "./cloud/storage-provider-factory";
import type { StorageInterface } from "./storage-interface";
import { singleton } from "@/lib/utils/singleton";

function createStorage(): StorageInterface {
  const useDatabase = process.env.USE_DATABASE === "true";

  if (useDatabase) {
    const cloudStorage = getCloudStorageProvider();
    console.log("Using DatabaseStorage (Prisma + PostgreSQL)");
    return new DatabaseStorage(cloudStorage);
  }

  console.log("Using FileStorage (local files)");
  return new FileStorage();
}

/**
 * Get the singleton storage instance
 */
export const getStorage = singleton(createStorage);
