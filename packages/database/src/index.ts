/**
 * @sync-hire/database
 *
 * Shared database package for SyncHire monorepo.
 * Provides Prisma client, types, and utilities.
 */

// Export Prisma client instance and utilities
export { prisma, disconnectPrisma, validateDatabaseConnection } from './client';

// Re-export Prisma types (models and namespaces)
export type {
  Prisma,
  PrismaClient,
  User,
  Account,
  Session,
  VerificationToken,
  CVUpload,
  Job,
  JobQuestion,
  CandidateApplication,
  Interview,
  Notification,
  InterviewCall,
} from '@prisma/client';

// Re-export enums (as values, usable at runtime)
export {
  UserRole,
  JobStatus,
  MatchingStatus,
  QuestionType as PrismaQuestionType,
  ApplicationStatus,
  ApplicationSource,
  InterviewStatus,
  NotificationType,
} from '@prisma/client';

// Export custom types with relations
export * from './types';

// Export JSON field types
export * from './json-types';
