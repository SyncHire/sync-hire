# Spec: Database

**Capability:** `database`
**Status:** Proposed
**Related Capabilities:** `authentication` (provides schema), `nextjs-application` (integrates with)

## Overview

Configure Prisma ORM with PostgreSQL schema for Cloud SQL, including NextAuth tables and core application models.

## ADDED Requirements

### Requirement: Prisma Schema Definition

The system SHALL define a Prisma schema with User, Job, Application, and Interview models.

#### Scenario: Generate Prisma Client

**Given** the Prisma schema is defined
**When** a developer runs `npx prisma generate`
**Then** TypeScript types are generated for all models
**And** Prisma Client is ready for use in Next.js

#### Scenario: Run migrations

**Given** schema changes are made
**When** a developer runs `npx prisma migrate dev --name <name>`
**Then** migration SQL is generated
**And** migration is applied to local PostgreSQL
**And** Prisma Client is regenerated

### Requirement: Core Data Models

The system SHALL provide models for Jobs, Applications, Interviews with proper relationships.

#### Scenario: Create job with questions

**Given** an employer creates a job
**When** system generates questions
**Then** Job record is created
**And** Question records are created with foreign key to Job
**And** cascade delete removes questions when job is deleted

#### Scenario: Create application

**Given** a candidate applies to a job
**When** application is submitted
**Then** Application record is created
**And** foreign keys link to User and Job
**And** cvAnalysis JSON field stores AI analysis

### Requirement: Database Connections

The system SHALL support both local PostgreSQL (development) and Cloud SQL (production).

#### Scenario: Connect locally

**Given** Docker Compose is running PostgreSQL
**When** Prisma connects using DATABASE_URL
**Then** connection succeeds to localhost:5432
**And** queries execute successfully

#### Scenario: Configure Cloud SQL

**Given** production environment
**When** DATABASE_URL includes Cloud SQL connection name
**Then** Prisma uses Cloud SQL Auth Proxy
**And** connection is secure and managed

## Configuration

###Prisma Schema (prisma/schema.prisma):
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// NextAuth models (from authentication capability)
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  emailVerified DateTime?
  image         String?
  password      String?
  role          Role      @default(CANDIDATE)
  accounts      Account[]
  sessions      Session[]
  // Application models
  jobs          Job[]
  applications  Application[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime
  @@unique([identifier, token])
}

// Application models
model Job {
  id              String        @id @default(cuid())
  title           String
  description     String        @db.Text
  experienceLevel ExperienceLevel
  employmentType  EmploymentType
  location        String
  salaryMin       Int?
  salaryMax       Int?
  salaryCurrency  String        @default("USD")
  skills          String[]
  status          JobStatus     @default(ACTIVE)
  employerId      String
  employer        User          @relation(fields: [employerId], references: [id])
  questions       Question[]
  applications    Application[]
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
}

model Question {
  id               String   @id @default(cuid())
  jobId            String
  job              Job      @relation(fields: [jobId], references: [id], onDelete: Cascade)
  text             String   @db.Text
  category         QuestionCategory
  difficulty       Difficulty
  expectedDuration Int?     // seconds
  order            Int
  createdAt        DateTime @default(now())
}

model Application {
  id                    String              @id @default(cuid())
  jobId                 String
  candidateId           String
  job                   Job                 @relation(fields: [jobId], references: [id])
  candidate             User                @relation(fields: [candidateId], references: [id])
  status                ApplicationStatus   @default(SUBMITTED)
  cvUrl                 String
  coverLetter           String?             @db.Text
  cvAnalysis            Json?               // AI analysis results
  personalizedQuestions Json?               // Array of personalized questions
  interview             Interview?
  createdAt             DateTime            @default(now())
  updatedAt             DateTime            @updatedAt
}

model Interview {
  id            String          @id @default(cuid())
  applicationId String          @unique
  application   Application     @relation(fields: [applicationId], references: [id])
  callId        String          @unique
  status        InterviewStatus @default(SCHEDULED)
  scheduledAt   DateTime?
  startedAt     DateTime?
  endedAt       DateTime?
  duration      Int?            // seconds
  transcript    String?         @db.Text
  summary       String?         @db.Text
  score         Int?            // 0-100
  insights      Json?           // AI-generated insights
  recordingUrl  String?
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt
}

// Enums
enum Role {
  CANDIDATE
  EMPLOYER
  ADMIN
}

enum JobStatus {
  DRAFT
  ACTIVE
  CLOSED
}

enum ExperienceLevel {
  ENTRY
  MID
  SENIOR
  LEAD
}

enum EmploymentType {
  FULL_TIME
  PART_TIME
  CONTRACT
  INTERNSHIP
}

enum QuestionCategory {
  TECHNICAL
  BEHAVIORAL
  PROBLEM_SOLVING
}

enum Difficulty {
  EASY
  MEDIUM
  HARD
}

enum ApplicationStatus {
  SUBMITTED
  UNDER_REVIEW
  APPROVED
  INTERVIEW_SCHEDULED
  INTERVIEW_IN_PROGRESS
  INTERVIEW_COMPLETED
  INTERVIEW_PASSED
  REJECTED
  WITHDRAWN
}

enum InterviewStatus {
  SCHEDULED
  WAITING_FOR_CANDIDATE
  IN_PROGRESS
  COMPLETED
  CANCELLED
  FAILED
}
```

### Prisma Client (src/lib/prisma.ts):
```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

## Dependencies

- @prisma/client
- prisma (dev dependency)
- PostgreSQL 16+

## Validation

- `npx prisma generate` creates types
- `npx prisma migrate dev` applies migrations
- `npx prisma studio` opens database GUI
- Can query User, Job, Application, Interview models

## References

- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
- [Prisma Client API](https://www.prisma.io/docs/reference/api-reference/prisma-client-reference)
