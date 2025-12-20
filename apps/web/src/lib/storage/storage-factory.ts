/**
 * Storage Factory
 *
 * Creates the storage implementation.
 * DatabaseStorage uses Prisma for all data operations.
 */

import { prisma } from "@sync-hire/database";
import { singleton } from "@/lib/utils/singleton";
import { DatabaseStorage } from "./database-storage";
import type { StorageInterface } from "./storage-interface";

function createStorage(): StorageInterface {
  return new DatabaseStorage(prisma);
}

/**
 * Get the singleton storage instance
 */
export const getStorage = singleton(createStorage);
