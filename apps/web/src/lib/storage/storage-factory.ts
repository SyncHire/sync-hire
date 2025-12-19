/**
 * Storage Factory
 *
 * Creates the storage implementation.
 * DatabaseStorage uses Prisma for all data operations.
 */

import { prisma } from "@sync-hire/database";
import { DatabaseStorage } from "./database-storage";
import type { StorageInterface } from "./storage-interface";
import { singleton } from "@/lib/utils/singleton";

function createStorage(): StorageInterface {
  return new DatabaseStorage(prisma);
}

/**
 * Get the singleton storage instance
 */
export const getStorage = singleton(createStorage);
