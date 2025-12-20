/**
 * Authentication & Authorization Middleware
 *
 * Composable functions for route protection following the existing
 * withRateLimit/withQuota pattern. Returns Response if denied, null if allowed.
 *
 * Usage:
 * ```typescript
 * const { response, context } = await withOrgMembership(orgId);
 * if (response) return response;
 * // context.userId, context.orgId, context.role are now available
 * ```
 */

import { prisma, OrgMemberRole } from "@sync-hire/database";
import { errors } from "./api-response";
import { getServerSession } from "./auth-server";
import {
  getCachedMembership,
  setCachedMembership,
} from "./membership-cache";
import { logger } from "./logger";

// =============================================================================
// Types
// =============================================================================

export interface AuthContext {
  userId: string;
  orgId: string;
  role: OrgMemberRole;
}

export interface AuthResult {
  response: Response | null;
  context: AuthContext | null;
}

export interface JobAccessResult extends AuthResult {
  jobOrgId?: string;
}

export interface InterviewAccessResult extends AuthResult {
  isCandidate?: boolean;
  jobOrgId?: string;
}

// =============================================================================
// Organization Membership Verification
// =============================================================================

/**
 * Verify user is a member of the specified organization.
 * Uses caching to minimize DB queries (3-minute TTL).
 *
 * @param orgId - Organization ID from URL params
 * @param requiredRoles - Optional: require specific role(s) (e.g., ['owner', 'admin'])
 * @returns Response if denied, null with context if allowed
 *
 * @example
 * const { response, context } = await withOrgMembership(orgId);
 * if (response) return response;
 * // Use context.userId, context.role
 */
export async function withOrgMembership(
  orgId: string,
  requiredRoles?: OrgMemberRole[]
): Promise<AuthResult> {
  // 1. Get authenticated session
  const session = await getServerSession();
  if (!session) {
    return {
      response: errors.unauthorized(),
      context: null,
    };
  }

  const userId = session.user.id;

  // 2. Check cache first
  let role = await getCachedMembership(userId, orgId);

  // 3. Cache miss - query database
  if (!role) {
    const membership = await prisma.member.findFirst({
      where: { userId, organizationId: orgId },
      select: { role: true },
    });

    if (!membership) {
      logger.warn("Org membership denied - not a member", {
        api: "auth-middleware",
        userId,
        orgId,
      });
      return {
        response: errors.forbidden("Not a member of this organization"),
        context: null,
      };
    }

    role = membership.role;

    // Cache the result
    await setCachedMembership(userId, orgId, role);
  }

  // 4. Check role requirements if specified
  if (requiredRoles && requiredRoles.length > 0) {
    if (!requiredRoles.includes(role)) {
      logger.warn("Org membership denied - insufficient role", {
        api: "auth-middleware",
        userId,
        orgId,
        userRole: role,
        requiredRoles,
      });
      return {
        response: errors.forbidden("Insufficient permissions"),
        context: null,
      };
    }
  }

  return {
    response: null,
    context: { userId, orgId, role },
  };
}

// =============================================================================
// Job Ownership Verification (Job -> Organization -> Membership)
// =============================================================================

/**
 * Verify user has access to a job through organization membership.
 * Job ownership chain: Job -> Organization -> Member
 *
 * @param jobId - Job ID from URL params
 * @param requiredRoles - Optional: require specific role(s)
 * @returns Response if denied, null with context and jobOrgId if allowed
 *
 * @example
 * const { response, context, jobOrgId } = await withJobAccess(jobId);
 * if (response) return response;
 * // Use context for user info, jobOrgId for organization
 */
export async function withJobAccess(
  jobId: string,
  requiredRoles?: OrgMemberRole[]
): Promise<JobAccessResult> {
  // 1. Get authenticated session
  const session = await getServerSession();
  if (!session) {
    return {
      response: errors.unauthorized(),
      context: null,
    };
  }

  // 2. Get job to find its organization
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { organizationId: true },
  });

  if (!job) {
    return {
      response: errors.notFound("Job"),
      context: null,
    };
  }

  // 3. Verify org membership (with caching)
  const membershipResult = await withOrgMembership(
    job.organizationId,
    requiredRoles
  );

  if (membershipResult.response) {
    return membershipResult;
  }

  return {
    response: null,
    context: membershipResult.context,
    jobOrgId: job.organizationId,
  };
}

// =============================================================================
// Interview Access Verification
// =============================================================================

export interface InterviewAccessOptions {
  /** Allow the interview candidate to access (for viewing their own interview) */
  allowCandidate?: boolean;
  /** Require specific role(s) for HR access */
  requiredRoles?: OrgMemberRole[];
}

/**
 * Verify user has access to an interview.
 * Two access patterns:
 * 1. HR: through organization membership (interview -> job -> org -> member)
 * 2. Candidate: direct access if they are the interview candidate
 *
 * @param interviewId - Interview ID from URL params
 * @param options - Access control options
 * @returns Response if denied, null with context and access info if allowed
 *
 * @example
 * // HR only
 * const { response, context } = await withInterviewAccess(interviewId);
 *
 * @example
 * // HR or candidate
 * const { response, isCandidate } = await withInterviewAccess(interviewId, { allowCandidate: true });
 */
export async function withInterviewAccess(
  interviewId: string,
  options: InterviewAccessOptions = {}
): Promise<InterviewAccessResult> {
  const { allowCandidate = false, requiredRoles } = options;

  // 1. Get authenticated session
  const session = await getServerSession();
  if (!session) {
    return {
      response: errors.unauthorized(),
      context: null,
    };
  }

  const userId = session.user.id;

  // 2. Get interview with job relation
  const interview = await prisma.interview.findUnique({
    where: { id: interviewId },
    select: {
      candidateId: true,
      job: { select: { organizationId: true } },
    },
  });

  if (!interview) {
    return {
      response: errors.notFound("Interview"),
      context: null,
    };
  }

  // 3. Check if user is the candidate
  if (allowCandidate && interview.candidateId === userId) {
    return {
      response: null,
      context: {
        userId,
        orgId: interview.job.organizationId,
        role: "member" as OrgMemberRole, // Candidates have member-level view
      },
      isCandidate: true,
      jobOrgId: interview.job.organizationId,
    };
  }

  // 4. Check org membership through job
  const membershipResult = await withOrgMembership(
    interview.job.organizationId,
    requiredRoles
  );

  if (membershipResult.response) {
    return membershipResult;
  }

  return {
    response: null,
    context: membershipResult.context,
    isCandidate: false,
    jobOrgId: interview.job.organizationId,
  };
}

// =============================================================================
// Application Access Verification
// =============================================================================

export interface ApplicationAccessResult extends AuthResult {
  isCandidate?: boolean;
  jobOrgId?: string;
}

export interface ApplicationAccessOptions {
  /** Allow the application candidate to access (for viewing their own application) */
  allowCandidate?: boolean;
  /** Require specific role(s) for HR access */
  requiredRoles?: OrgMemberRole[];
}

/**
 * Verify user has access to a candidate application.
 * Two access patterns:
 * 1. HR: through organization membership (application -> job -> org -> member)
 * 2. Candidate: direct access if they are the applicant
 *
 * @param applicationId - Application ID from URL params
 * @param options - Access control options
 * @returns Response if denied, null with context and access info if allowed
 */
export async function withApplicationAccess(
  applicationId: string,
  options: ApplicationAccessOptions = {}
): Promise<ApplicationAccessResult> {
  const { allowCandidate = false, requiredRoles } = options;

  // 1. Get authenticated session
  const session = await getServerSession();
  if (!session) {
    return {
      response: errors.unauthorized(),
      context: null,
    };
  }

  const userId = session.user.id;

  // 2. Get application with job relation
  const application = await prisma.candidateApplication.findUnique({
    where: { id: applicationId },
    include: {
      job: { select: { organizationId: true } },
    },
  });

  if (!application) {
    return {
      response: errors.notFound("Application"),
      context: null,
    };
  }

  // 3. Check if user is the candidate (userId is the applicant's user ID)
  if (allowCandidate && application.userId === userId) {
    return {
      response: null,
      context: {
        userId,
        orgId: application.job.organizationId,
        role: "member" as OrgMemberRole,
      },
      isCandidate: true,
      jobOrgId: application.job.organizationId,
    };
  }

  // 4. Check org membership through job
  const membershipResult = await withOrgMembership(
    application.job.organizationId,
    requiredRoles
  );

  if (membershipResult.response) {
    return membershipResult;
  }

  return {
    response: null,
    context: membershipResult.context,
    isCandidate: false,
    jobOrgId: application.job.organizationId,
  };
}

// =============================================================================
// Simple Auth Check (No Org Context)
// =============================================================================

/**
 * Verify user is authenticated (no organization check).
 * Use this for user-scoped resources that don't belong to an org.
 *
 * @returns Response if not authenticated, null with userId if authenticated
 *
 * @example
 * const { response, userId } = await withAuth();
 * if (response) return response;
 */
export async function withAuth(): Promise<{
  response: Response | null;
  userId: string | null;
}> {
  const session = await getServerSession();
  if (!session) {
    return {
      response: errors.unauthorized(),
      userId: null,
    };
  }

  return {
    response: null,
    userId: session.user.id,
  };
}
