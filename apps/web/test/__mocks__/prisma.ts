/**
 * Prisma Mock Singleton
 *
 * Creates a deep mock of PrismaClient that can be used in tests.
 * Import this mock in test files and use it to set up expected return values.
 */

import type { PrismaClient } from "@sync-hire/database";
import { beforeEach } from "vitest";
import { mockDeep, mockReset } from "vitest-mock-extended";

// Create singleton mock
export const prismaMock = mockDeep<PrismaClient>();

// Auto-reset between tests when imported
beforeEach(() => {
  mockReset(prismaMock);
});
