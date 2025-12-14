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
// Organization Types
// =============================================================================

export type OrganizationWithMembers = Prisma.OrganizationGetPayload<{
  include: {
    members: {
      include: {
        user: true;
      };
    };
  };
}>;

export type OrganizationWithJobs = Prisma.OrganizationGetPayload<{
  include: {
    jobs: true;
    members: true;
  };
}>;

export type OrganizationMemberWithRelations =
  Prisma.OrganizationMemberGetPayload<{
    include: {
      organization: true;
      user: true;
    };
  }>;

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

export type UserWithOrganizations = Prisma.UserGetPayload<{
  include: {
    organizationMembers: {
      include: {
        organization: true;
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

export type JobWithOrganization = Prisma.JobGetPayload<{
  include: {
    organization: true;
    createdBy: true;
  };
}>;

export type JobWithApplications = Prisma.JobGetPayload<{
  include: {
    organization: true;
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
