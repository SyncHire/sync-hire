/**
 * Database Connection Test Script
 *
 * Verifies database connectivity and Prisma client functionality.
 * Run with: pnpm db:test
 */

import { config } from 'dotenv';
import { prisma, disconnectPrisma } from '../src/client.js';

// Load environment variables
config();

async function testDatabase() {
  console.log('🔍 Testing database connection...\n');

  try {
    // Test 1: Connection
    console.log('1. Testing connection...');
    await prisma.$connect();
    console.log('   ✅ Successfully connected to database\n');

    // Test 2: Query users
    console.log('2. Querying users...');
    const users = await prisma.user.findMany({
      take: 5,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });
    console.log(`   ✅ Found ${users.length} users:`);
    users.forEach((user) => {
      console.log(`      - ${user.name} (${user.email}) - ${user.role}`);
    });
    console.log('');

    // Test 3: Query jobs
    console.log('3. Querying jobs...');
    const jobs = await prisma.job.findMany({
      take: 5,
      select: {
        id: true,
        title: true,
        company: true,
        status: true,
      },
    });
    console.log(`   ✅ Found ${jobs.length} jobs:`);
    jobs.forEach((job) => {
      console.log(`      - ${job.title} at ${job.company} (${job.status})`);
    });
    console.log('');

    // Test 4: Database info
    console.log('4. Database information:');
    const result = await prisma.$queryRaw<
      Array<{ version: string }>
    >`SELECT version()`;
    console.log(`   ✅ PostgreSQL version: ${result[0]?.version.split(' ')[0]} ${result[0]?.version.split(' ')[1]}`);
    console.log('');

    console.log('✅ All tests passed!\n');
  } catch (error) {
    console.error('❌ Database test failed:', error);
    process.exit(1);
  } finally {
    await disconnectPrisma();
    console.log('🔌 Disconnected from database');
  }
}

testDatabase();
