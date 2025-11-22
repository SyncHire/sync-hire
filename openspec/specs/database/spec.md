# database Specification

## Purpose
TBD - created by archiving change initialize-synchire-monorepo. Update Purpose after archive.
## Requirements
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

