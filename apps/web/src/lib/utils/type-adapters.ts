/**
 * Type Adapter Utilities
 *
 * Helper functions to convert between Prisma database types and
 * domain types (ExtractedJobData, ExtractedCVData, etc.)
 *
 * These adapters handle the conversion between:
 * - Prisma string fields → strict enum types
 * - Database nullable fields → required domain fields
 *
 * TODO: Remove these once mock-data types are fully deprecated
 */

import type {
  EmploymentType,
  WorkArrangement,
  ExtractedJobData,
  Interview as PrismaInterview,
} from "@sync-hire/database";
import { InterviewStatus } from "@sync-hire/database";
import type { Interview as MockInterview } from "@/lib/mock-data";

// Valid employment types for ExtractedJobData
const VALID_EMPLOYMENT_TYPES: EmploymentType[] = ['Full-time', 'Part-time', 'Contract', 'Internship'];
const DEFAULT_EMPLOYMENT_TYPE: EmploymentType = 'Full-time';

// Valid work arrangements for ExtractedJobData
const VALID_WORK_ARRANGEMENTS: WorkArrangement[] = ['On-site', 'Remote', 'Hybrid'];
const DEFAULT_WORK_ARRANGEMENT: WorkArrangement = 'On-site';

/**
 * Converts a string to EmploymentType, returning default if invalid
 */
export function toEmploymentType(value: string | null | undefined): EmploymentType {
  if (value && VALID_EMPLOYMENT_TYPES.includes(value as EmploymentType)) {
    return value as EmploymentType;
  }
  return DEFAULT_EMPLOYMENT_TYPE;
}

/**
 * Converts a string to WorkArrangement, returning default if invalid
 */
export function toWorkArrangement(value: string | null | undefined): WorkArrangement {
  if (value && VALID_WORK_ARRANGEMENTS.includes(value as WorkArrangement)) {
    return value as WorkArrangement;
  }
  return DEFAULT_WORK_ARRANGEMENT;
}

/**
 * Creates ExtractedJobData from a Prisma Job record with organization
 */
export function jobToExtractedJobData(job: {
  title: string;
  organization: { name: string };
  location: string;
  employmentType: string;
  workArrangement: string | null;
  requirements: string[];
  description: string;
  department?: string | null;
}): ExtractedJobData {
  return {
    title: job.title,
    company: job.organization.name,
    location: job.location,
    employmentType: toEmploymentType(job.employmentType),
    workArrangement: toWorkArrangement(job.workArrangement),
    seniority: job.department || "",
    requirements: job.requirements,
    responsibilities: job.description ? [job.description] : [],
  };
}

/**
 * Converts a mock Interview to the Prisma Interview type
 * Mock status values are a subset of InterviewStatus enum values
 */
export function mockInterviewToInterview(mockInterview: MockInterview): PrismaInterview {
  return {
    id: mockInterview.id,
    jobId: mockInterview.jobId,
    candidateId: mockInterview.candidateId,
    status: mockInterview.status as InterviewStatus, // Safe cast - mock values are subset of enum
    callId: mockInterview.callId ?? null, // Convert undefined to null
    transcript: mockInterview.transcript ?? null,
    score: mockInterview.score ?? null,
    durationMinutes: mockInterview.durationMinutes,
    aiEvaluation: mockInterview.aiEvaluation ?? null,
    createdAt: mockInterview.createdAt,
    completedAt: mockInterview.completedAt ?? null,
  };
}
