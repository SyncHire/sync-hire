/**
 * Custom Database Types
 *
 * Define reusable types for queries with relations.
 * Use Prisma.XGetPayload with inline include objects.
 *
 * Pattern:
 * export type MyType = Prisma.ModelGetPayload<{ include: { relations: true } }>
 */

import type { Prisma } from '@prisma/client';

// =============================================================================
// User Types
// =============================================================================

export type UserWithInterviews = Prisma.UserGetPayload<{
  include: { interviews: true };
}>;

export type UserWithApplications = Prisma.UserGetPayload<{
  include: {
    applications: {
      include: {
        job: true;
        cvUpload: true;
      };
    };
  };
}>;

// =============================================================================
// Job Types
// =============================================================================

export type JobWithQuestions = Prisma.JobGetPayload<{
  include: { questions: true };
}>;

export type JobWithApplications = Prisma.JobGetPayload<{
  include: {
    applications: {
      include: {
        cvUpload: true;
        interview: true;
      };
    };
    questions: true;
  };
}>;

// =============================================================================
// Application Types
// =============================================================================

export type ApplicationWithRelations = Prisma.CandidateApplicationGetPayload<{
  include: {
    job: true;
    cvUpload: true;
    interview: true;
    user: true;
  };
}>;

// =============================================================================
// Interview Types
// =============================================================================

export type InterviewWithJob = Prisma.InterviewGetPayload<{
  include: {
    job: true;
    candidate: true;
  };
}>;

// =============================================================================
// CV Types
// =============================================================================

export type CVWithApplications = Prisma.CVUploadGetPayload<{
  include: {
    applications: {
      include: {
        job: true;
      };
    };
  };
}>;
