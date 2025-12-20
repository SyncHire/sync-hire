/**
 * Prisma Test Context with Transaction Rollback
 *
 * Each test runs in an isolated transaction that automatically rolls back,
 * ensuring fast, isolated tests without database cleanup.
 *
 * Based on Prisma 7 best practices:
 * @see https://www.prisma.io/docs/guides/testing/unit-testing
 */

import { Prisma, PrismaClient } from "@sync-hire/database";

// Extend Prisma transaction client type for better typing
export type TransactionClient = Omit<
  PrismaClient,
  | "$connect"
  | "$disconnect"
  | "$on"
  | "$transaction"
  | "$use"
  | "$extends"
  | "$executeRaw"
  | "$executeRawUnsafe"
  | "$queryRaw"
  | "$queryRawUnsafe"
>;

interface TestContext {
  prisma: TransactionClient;
}

/**
 * Custom error class to signal intentional rollback
 */
class RollbackError extends Error {
  constructor(public readonly result: unknown) {
    super("Intentional rollback");
    this.name = "RollbackError";
  }
}

/**
 * Creates an isolated test context with a transaction-scoped Prisma client.
 * The transaction is rolled back after the test callback completes.
 *
 * @example
 * ```ts
 * import { createTestContext } from '@/test/helpers/prisma-test-context';
 *
 * describe('Jobs API', () => {
 *   it('should create a job', async () => {
 *     await createTestContext(async ({ prisma }) => {
 *       const job = await prisma.job.create({ ... });
 *       expect(job).toBeDefined();
 *     });
 *     // Transaction is automatically rolled back here
 *   });
 * });
 * ```
 */
export async function createTestContext<T>(
  callback: (ctx: TestContext) => Promise<T>,
): Promise<T> {
  const prisma = new PrismaClient();

  try {
    return await prisma.$transaction(
      async (tx) => {
        const result = await callback({ prisma: tx as TransactionClient });

        // Force rollback by throwing after callback completes
        // This is caught in the outer try-catch and ignored
        throw new RollbackError(result);
      },
      {
        maxWait: 5000,
        timeout: 10000,
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  } catch (error) {
    if (error instanceof RollbackError) {
      return error.result as T;
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Alternative: Vitest fixture-based context for shared setup
 * Use this pattern when multiple tests need the same base data.
 */
export function createTestFixture() {
  let prisma: PrismaClient;

  const beforeAll = async () => {
    prisma = new PrismaClient();
    await prisma.$connect();
  };

  const afterAll = async () => {
    await prisma.$disconnect();
  };

  const withTransaction = async <T>(
    callback: (tx: TransactionClient) => Promise<T>,
  ): Promise<T> => {
    try {
      return await prisma.$transaction(async (tx) => {
        const result = await callback(tx as TransactionClient);
        throw new RollbackError(result);
      });
    } catch (error) {
      if (error instanceof RollbackError) {
        return error.result as T;
      }
      throw error;
    }
  };

  return { beforeAll, afterAll, withTransaction, getPrisma: () => prisma };
}
