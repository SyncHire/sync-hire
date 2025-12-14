/**
 * Prisma Client Singleton (Prisma 7)
 *
 * Ensures only one Prisma Client instance is created in development
 * to prevent connection exhaustion during hot reloading.
 *
 * Prisma 7 requires using a driver adapter for PostgreSQL.
 */

// Load environment variables (required for Prisma 7)
import 'dotenv/config';

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const { Pool } = pg;

// Validate DATABASE_URL is set
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    'DATABASE_URL environment variable is required. ' +
    'Please set it in your .env file or environment configuration.'
  );
}

const isProduction = process.env.NODE_ENV === 'production';

// Check if using VPC private IP connection (no SSL needed - VPC traffic is encrypted)
// Private IP connections use format: postgresql://user:pass@10.x.x.x:5432/db
const isPrivateIpConnection = connectionString.match(/@10\.\d+\.\d+\.\d+:/);

// Create connection pool for PostgreSQL with production-ready settings
const pool = new Pool({
  connectionString,
  max: parseInt(process.env.DB_POOL_MAX || '20', 10),
  min: parseInt(process.env.DB_POOL_MIN || '2', 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  // VPC private IP connections don't need SSL (traffic is already encrypted at network level)
  // Public connections in production should use SSL
  ssl: isProduction && !isPrivateIpConnection ? { rejectUnauthorized: true } : false,
});

// Create Prisma adapter
const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis as typeof globalThis & {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: [
      { emit: 'stdout', level: 'error' },
      { emit: 'stdout', level: 'warn' },
    ],
    errorFormat: 'pretty',
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Helper to safely disconnect (optional)
export async function disconnectPrisma() {
  await prisma.$disconnect();
  await pool.end();
}

/**
 * Validates database connection on startup.
 * Call this function during application initialization to catch
 * configuration errors early rather than on first query.
 *
 * @returns Promise that resolves with connection info on success
 * @throws Error with descriptive message if connection fails
 */
export async function validateDatabaseConnection(): Promise<{
  connected: boolean;
  database: string;
  latencyMs: number;
}> {
  const startTime = Date.now();

  try {
    // Test the connection with a simple query
    const result = await prisma.$queryRaw<[{ current_database: string }]>`
      SELECT current_database()
    `;

    const latencyMs = Date.now() - startTime;
    const database = result[0]?.current_database ?? 'unknown';

    console.log(
      `✓ Database connection verified: ${database} (${latencyMs}ms)`
    );

    return {
      connected: true,
      database,
      latencyMs,
    };
  } catch (error) {
    const latencyMs = Date.now() - startTime;

    // Provide helpful error messages for common issues
    let message = 'Failed to connect to database';

    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED')) {
        message =
          'Database connection refused. Is PostgreSQL running? ' +
          'Check that the database server is started and accepting connections.';
      } else if (error.message.includes('ENOTFOUND')) {
        message =
          'Database host not found. Check the DATABASE_URL hostname is correct.';
      } else if (error.message.includes('authentication failed')) {
        message =
          'Database authentication failed. Check the username and password in DATABASE_URL.';
      } else if (error.message.includes('does not exist')) {
        message =
          'Database does not exist. Run "pnpm db:push" to create the database schema.';
      } else {
        message = `Database connection failed: ${error.message}`;
      }
    }

    console.error(`✗ ${message} (attempted for ${latencyMs}ms)`);
    throw new Error(message);
  }
}
