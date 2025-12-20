/**
 * @sync-hire/database
 *
 * Shared database package for SyncHire monorepo.
 * Provides Prisma client, types, and utilities.
 */

// Export Prisma client instance and utilities
export { prisma, disconnectPrisma, validateDatabaseConnection } from './client';

// Re-export Prisma namespace and class (as values for runtime use)
export { Prisma, PrismaClient } from '@prisma/client';

// Re-export Prisma types (models)
export type {
  User,
  Account,
  Session,
  Verification,
  Organization,
  Member,
  CVUpload,
  Job,
  JobQuestion,
  CandidateApplication,
  Interview,
  Notification,
  InterviewCall,
  OrganizationQuota,
  AIUsageRecord,
} from '@prisma/client';

// Re-export enums (as values, usable at runtime)
export {
  OrgMemberRole,
  JobStatus,
  MatchingStatus,
  QuestionType as PrismaQuestionType,
  ApplicationStatus,
  ApplicationSource,
  InterviewStatus,
  NotificationType,
  QuotaTier,
} from '@prisma/client';

// Export custom types with relations
export * from './types';

// Export JSON field types
export * from './json-types';
