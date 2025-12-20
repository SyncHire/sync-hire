/**
 * Prisma 7 Configuration
 *
 * Defines database connection, schema location, and migrations path.
 * Environment variables are loaded explicitly using dotenv.
 */

import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'npx tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? '',
  },
});
