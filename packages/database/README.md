# @sync-hire/database

Shared database package for SyncHire monorepo using **Prisma ORM 7** with PostgreSQL.

## Overview

This package provides:
- **Prisma 7** schema and client with PostgreSQL adapter
- TypeScript types for all database models
- Seed data for development
- Database utilities and helpers

## Features

- ✅ **Prisma 7** with latest best practices
- ✅ **PostgreSQL adapter** for optimal performance
- ✅ **Turborepo integration** with task dependencies
- ✅ **Environment variable management** with dotenv
- ✅ **Connection pooling** for production readiness
- ✅ **Type-safe database queries**

---

## Quick Start (5 minutes)

### Prerequisites

- Node.js 20+
- PNPM 9+
- PostgreSQL 16+ (Docker recommended OR local installation)

### Step 1: Start Local PostgreSQL

**Option A: Using Docker (Recommended)**
```bash
docker run --name synchire-postgres \
  -e POSTGRES_PASSWORD=synchire \
  -e POSTGRES_DB=synchire \
  -p 5432:5432 \
  -d postgres:16
```

**Option B: Using Local PostgreSQL**
```bash
# macOS (Homebrew)
brew install postgresql@16
brew services start postgresql@16

# Create database
createdb synchire
```

### Step 2: Set Up Environment Variables

Create `.env` file in `packages/database/`:

```bash
DATABASE_URL="postgresql://kes@localhost:5432/synchire"
```

Or with Docker:
```bash
DATABASE_URL="postgresql://postgres:synchire@localhost:5432/synchire"
```

### Step 3: Install Dependencies

From the **monorepo root**:
```bash
pnpm install
```

### Step 4: Generate Prisma Client & Push Schema

```bash
# Generate Prisma Client types
pnpm db:generate

# Push schema to database (creates tables)
pnpm db:push
```

You should see:
```
✔ Generated Prisma Client (v7.1.0)
✔ Your database is now in sync with your schema
```

### Step 5: Seed the Database

```bash
pnpm db:seed
```

This creates:
- 3 demo users (1 candidate, 2 employers)
- 1 CV upload with extracted data
- 2 job postings with questions
- 1 application with 92% match score
- 1 completed interview with AI evaluation
- 3 notifications

### Step 6: Verify Setup

**Option A: Test Script**
```bash
pnpm db:test
```

**Option B: Prisma Studio (Visual DB Explorer)**
```bash
pnpm db:studio
```
Opens at http://localhost:5555 - Browse your database visually!

**Option C: Command Line**
```bash
# Connect to PostgreSQL (Docker)
docker exec -it synchire-postgres psql -U postgres -d synchire

# List tables
\dt

# View users
SELECT id, name, email, role FROM users;

# Exit
\q
```

---

## Usage in Apps

### Import Prisma Client

```typescript
import { prisma } from '@sync-hire/database';

// Find user
const user = await prisma.user.findUnique({
  where: { email: 'demo@synchire.com' },
});

// Create job
const job = await prisma.job.create({
  data: {
    title: 'Software Engineer',
    company: 'Acme Inc',
    employerId: user.id,
    requirements: ['5+ years experience'],
    status: 'ACTIVE',
  },
});

// Query with relations
const jobWithQuestions = await prisma.job.findUnique({
  where: { id: 'job-1' },
  include: {
    questions: true,
    applications: true,
  },
});
```

### Import Types

```typescript
import { User, Job, Interview, CandidateApplication } from '@sync-hire/database';

// Use base types
const user: User = await prisma.user.findFirst();

// Use custom types with relations
import type { UserWithInterviews, JobWithApplications } from '@sync-hire/database';

const user: UserWithInterviews = await prisma.user.findFirst({
  include: { interviews: true }
});
```

### Custom Types with Relations

The package exports pre-defined types for common queries with relations (see `src/types.ts`):

- `UserWithInterviews` - User + interviews
- `UserWithApplications` - User + applications (with job + CV)
- `JobWithQuestions` - Job + questions
- `JobWithApplications` - Job + applications (with CV + interview)
- `ApplicationWithRelations` - Application + job + CV + interview + user
- `InterviewWithJob` - Interview + job + candidate
- `CVWithApplications` - CV + applications (with job)

**Add new types** in `packages/database/src/types.ts` following the pattern:

```typescript
export type MyCustomType = Prisma.ModelGetPayload<{
  include: { /* your relations */ };
}>;
```

---

## Database Schema

See `prisma/schema.prisma` for the complete schema.

### Core Models

1. **User** - Authentication & user profiles
   - Fields: id, name, email, role (EMPLOYER/CANDIDATE/ADMIN)
   - Relations: CVs, applications, interviews, jobs posted

2. **CVUpload** - Uploaded resumes with extracted data
   - Fields: fileName, fileUrl, fileHash, extraction (JSON)
   - Stores ExtractedCVData as JSON

3. **Job** - Job postings
   - Fields: title, company, requirements, aiMatchingEnabled
   - Relations: questions, applications, interviews

4. **JobQuestion** - Interview questions for jobs
   - Fields: content, type, duration, category
   - Types: SHORT_ANSWER, LONG_ANSWER, MULTIPLE_CHOICE, SCORED

5. **CandidateApplication** - Application records
   - Fields: matchScore, matchReasons, skillGaps, status
   - Sources: AI_MATCH or MANUAL_APPLY

6. **Interview** - Interview sessions
   - Fields: status, transcript, score, aiEvaluation (JSON)
   - Stores AIEvaluation as JSON

7. **Notification** - User notifications
   - Fields: type, title, message, read

8. **InterviewCall** - Active call tracking
   - Replaces in-memory Map for serverless compatibility

### NextAuth Models

9. **Account** - OAuth accounts
10. **Session** - User sessions
11. **VerificationToken** - Email verification

---

## Available Commands

All commands can be run from **monorepo root** or `packages/database/`:

### Development
```bash
pnpm db:generate          # Generate Prisma Client
pnpm db:push              # Push schema to DB (dev only)
pnpm db:studio            # Open Prisma Studio (http://localhost:5555)
pnpm db:test              # Test database connection
```

### Migrations (Production)
```bash
pnpm db:migrate           # Create new migration (dev)
pnpm db:migrate:deploy    # Apply migrations (requires DATABASE_URL)

# Production migration script (auto-loads DATABASE_URL from Secret Manager)
./scripts/migrate-production.sh              # Apply migrations
./scripts/migrate-production.sh --status     # Check migration status
./scripts/migrate-production.sh --seed       # Apply migrations + seed
```

### Seed & Reset
```bash
pnpm db:seed              # Seed database with demo data
pnpm db:reset             # Reset DB (⚠️ deletes all data)
```

---

## Common Tasks

### Adding a New Field

1. Edit `prisma/schema.prisma`:
```prisma
model User {
  // ... existing fields
  phoneNumber String? // New field
}
```

2. Push changes:
```bash
pnpm db:generate
pnpm db:push
```

### Reset Database

```bash
# Delete all data and re-seed
pnpm db:reset

# Or manually
pnpm db:push --force-reset
pnpm db:seed
```

---

## Prisma 7 Configuration

This package uses **Prisma 7** with the following setup:

### `prisma.config.ts`
```typescript
import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
```

### Schema Configuration
```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../src/generated/client"  // Custom output path
}

datasource db {
  provider = "postgresql"
  // URL configured in prisma.config.ts
}
```

### Client with Adapter
```typescript
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const isProduction = process.env.NODE_ENV === 'production';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: parseInt(process.env.DB_POOL_MAX || '20', 10),
  min: parseInt(process.env.DB_POOL_MIN || '2', 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: isProduction ? { rejectUnauthorized: true } : false,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });
```

---

## Troubleshooting

### "Can't connect to database"

**Check PostgreSQL is running:**
```bash
# Docker
docker ps | grep synchire-postgres

# Local
lsof -i :5432
```

**Verify DATABASE_URL:**
```bash
cat .env | grep DATABASE_URL
```

### "Schema out of sync"

```bash
# Force reset schema
pnpm db:push --force-reset
pnpm db:seed
```

### "Prisma Client not generated"

```bash
pnpm db:generate
```

### "Cannot find module '@prisma/client'"

```bash
pnpm install
pnpm db:generate
```

### Tables exist but queries fail

Make sure `dotenv/config` is imported in your client code:
```typescript
import 'dotenv/config';
import { prisma } from '@sync-hire/database';
```

---

## Production Setup (GCP Cloud SQL)

### 1. Create Cloud SQL Instance

```bash
gcloud sql instances create synchire-db \
  --database-version=POSTGRES_16 \
  --tier=db-custom-4-16384 \
  --region=us-central1 \
  --backup-start-time=03:00 \
  --retained-backups-count=30
```

### 2. Configure Environment Variables

**Required:**
```env
DATABASE_URL="postgresql://user:password@/dbname?host=/cloudsql/project:region:instance"
USE_DATABASE=true
NODE_ENV=production
```

**Optional (connection pool tuning):**
```env
DB_POOL_MAX=20    # Maximum connections (default: 20)
DB_POOL_MIN=2     # Minimum connections (default: 2)
```

### 3. Production Features

The database package automatically enables these in production (`NODE_ENV=production`):

- **SSL enforcement** - All connections require SSL
- **Connection pooling** - Configurable max/min connections with timeouts
- **Hard startup failure** - App exits if database connection fails
- **Seed protection** - Seeding blocked unless `ALLOW_SEED=true`

### 4. Run Migrations Locally (via Cloud SQL Proxy)

**One-command migration** (recommended):
```bash
# Set up credentials (one-time)
gcloud auth application-default login

# Run migrations (starts proxy, fetches secrets, runs migration)
./scripts/migrate-cloud.sh

# Or check status / seed
./scripts/migrate-cloud.sh --status
./scripts/migrate-cloud.sh --seed
```

**Manual method** (if you need more control):
```bash
# 1. Start Cloud SQL Proxy (use port 5433 if local PostgreSQL is on 5432)
cloud-sql-proxy synchire-hackathon:asia-southeast1:synchire-db --port 5433

# 2. In another terminal, run migrations
DATABASE_URL="postgresql://synchire:PASSWORD@127.0.0.1:5433/synchire" ./scripts/migrate-production.sh
```

### 5. Seed Staging (Optional)

For staging environments only:
```bash
ALLOW_SEED=true pnpm db:seed
```

### 6. Verify Deployment

```bash
pnpm db:test
```

---

## Demo Accounts

After seeding, you can use these accounts:

- **Candidate**: demo@synchire.com (demo-user)
- **Employer 1**: hr@techcorp.com (employer-1)
- **Employer 2**: talent@startup.io (employer-2)

---

## Package Details

- **Prisma**: 7.1.0
- **PostgreSQL Adapter**: @prisma/adapter-pg@7.1.0
- **PostgreSQL Driver**: pg@8.16.3
- **TypeScript**: 5.9.3

---

## Resources

- [Prisma ORM Documentation](https://www.prisma.io/docs)
- [Prisma 7 Upgrade Guide](https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-to-prisma-7)
- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
- [Prisma Config Reference](https://www.prisma.io/docs/orm/reference/prisma-config-reference)
- [Prisma with Turborepo](https://www.prisma.io/docs/guides/turborepo)
- [NextAuth.js with Prisma](https://next-auth.js.org/adapters/prisma)
