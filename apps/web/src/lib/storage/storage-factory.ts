/**
 * Storage Factory
 *
 * Creates the appropriate storage implementation based on configuration.
 * DatabaseStorage uses Prisma for metadata, CloudStorageProvider handles file uploads separately.
 */

import { DatabaseStorage } from "./database-storage";
import { FileStorage } from "./file-storage";
import type { StorageInterface } from "./storage-interface";
import { singleton } from "@/lib/utils/singleton";

function createStorage(): StorageInterface {
  const useDatabase = process.env.USE_DATABASE === "true";

  if (useDatabase) {
    console.log("Using DatabaseStorage (Prisma + PostgreSQL)");
    return new DatabaseStorage();
  }

  console.log("Using FileStorage (local files)");
  return new FileStorage();
}

/**
 * Get the singleton storage instance
 */
export const getStorage = singleton(createStorage);
