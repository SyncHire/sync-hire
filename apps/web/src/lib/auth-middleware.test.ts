/**
 * Tests for auth-middleware.ts
 *
 * Security-critical tests for authentication and authorization middleware.
 * Covers:
 * - Authentication checks
 * - Organization membership verification
 * - Role-based access control
 * - Cross-organization access prevention
 * - Job/Interview/Application access patterns
 */

import type { OrgMemberRole } from "@sync-hire/database";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@test/__mocks__/prisma";
import {
  withApplicationAccess,
  withAuth,
  withInterviewAccess,
  withJobAccess,
  withOrgMembership,
} from "./auth-middleware";

// Mock auth-server
vi.mock("@/lib/auth-server", () => ({
  getServerSession: vi.fn(),
}));

// Mock membership cache
vi.mock("@/lib/membership-cache", () => ({
  getCachedMembership: vi.fn(),
  setCachedMembership: vi.fn(),
}));

// Mock prisma - uses singleton from test/__mocks__/prisma.ts
vi.mock("@sync-hire/database", async () => {
  const { prismaMock } = await import("@test/__mocks__/prisma");
  return { prisma: prismaMock };
});

// Helper to create mock session with proper typing
function createMockSession(userId: string, activeOrgId: string | null = null) {
  return {
    user: { id: userId, name: "Test User", email: "test@example.com" },
    session: { id: "session-1", activeOrganizationId: activeOrgId },
  } as Awaited<ReturnType<typeof import("@/lib/auth-server").getServerSession>>;
}

// Helper to create mock membership
function createMockMembership(
  userId: string,
  orgId: string,
  role: OrgMemberRole,
) {
  return {
    id: `member-${userId}-${orgId}`,
    userId,
    organizationId: orgId,
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// Helpers to create partial mock data with type coercion
// These are needed because the actual code uses `select` which returns narrower types
const mockJobData = (orgId: string) =>
  ({ organizationId: orgId }) as never;

const mockInterviewData = (candidateId: string, orgId: string) =>
  ({ candidateId, job: { organizationId: orgId } }) as never;

const mockApplicationData = (userId: string, orgId: string) =>
  ({ userId, job: { organizationId: orgId } }) as never;

describe("auth-middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // prismaMock is auto-reset by test/__mocks__/prisma.ts
  });

  // ===========================================================================
  // withAuth
  // ===========================================================================
  describe("withAuth", () => {
    it("should return 401 when not authenticated", async () => {
      const { getServerSession } = await import("@/lib/auth-server");
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      const result = await withAuth();

      expect(result.response).not.toBeNull();
      expect(result.response?.status).toBe(401);
      expect(result.userId).toBeNull();

      const json = await result.response?.json();
      expect(json.error.code).toBe("unauthorized");
    });

    it("should return userId when authenticated", async () => {
      const { getServerSession } = await import("@/lib/auth-server");
      vi.mocked(getServerSession).mockResolvedValueOnce(
        createMockSession("user-123"),
      );

      const result = await withAuth();

      expect(result.response).toBeNull();
      expect(result.userId).toBe("user-123");
    });
  });

  // ===========================================================================
  // withOrgMembership
  // ===========================================================================
  describe("withOrgMembership", () => {
    const orgId = "org-123";
    const userId = "user-456";

    it("should return 401 when not authenticated", async () => {
      const { getServerSession } = await import("@/lib/auth-server");
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      const result = await withOrgMembership(orgId);

      expect(result.response).not.toBeNull();
      expect(result.response?.status).toBe(401);
      expect(result.context).toBeNull();

      const json = await result.response?.json();
      expect(json.error.code).toBe("unauthorized");
    });

    it("should return 403 when user is not a member of the organization", async () => {
      const { getServerSession } = await import("@/lib/auth-server");
      const { getCachedMembership } = await import("@/lib/membership-cache");

      vi.mocked(getServerSession).mockResolvedValueOnce(
        createMockSession(userId),
      );
      vi.mocked(getCachedMembership).mockResolvedValueOnce(null);
      prismaMock.member.findFirst.mockResolvedValueOnce(null);

      const result = await withOrgMembership(orgId);

      expect(result.response).not.toBeNull();
      expect(result.response?.status).toBe(403);
      expect(result.context).toBeNull();

      const json = await result.response?.json();
      expect(json.error.code).toBe("forbidden");
      expect(json.error.message).toContain("Not a member");
    });

    it("should return context when user is a member (cache hit)", async () => {
      const { getServerSession } = await import("@/lib/auth-server");
      const { getCachedMembership, setCachedMembership } = await import(
        "@/lib/membership-cache"
      );

      vi.mocked(getServerSession).mockResolvedValueOnce(
        createMockSession(userId),
      );
      vi.mocked(getCachedMembership).mockResolvedValueOnce("admin");

      const result = await withOrgMembership(orgId);

      expect(result.response).toBeNull();
      expect(result.context).toEqual({
        userId,
        orgId,
        role: "admin",
      });

      // Should not hit database when cache has value
      expect(prismaMock.member.findFirst).not.toHaveBeenCalled();
      // Should not set cache again when already cached
      expect(setCachedMembership).not.toHaveBeenCalled();
    });

    it("should query database on cache miss and cache the result", async () => {
      const { getServerSession } = await import("@/lib/auth-server");
      const { getCachedMembership, setCachedMembership } = await import(
        "@/lib/membership-cache"
      );

      vi.mocked(getServerSession).mockResolvedValueOnce(
        createMockSession(userId),
      );
      vi.mocked(getCachedMembership).mockResolvedValueOnce(null);
      prismaMock.member.findFirst.mockResolvedValueOnce(
        createMockMembership(userId, orgId, "member"),
      );

      const result = await withOrgMembership(orgId);

      expect(result.response).toBeNull();
      expect(result.context).toEqual({
        userId,
        orgId,
        role: "member",
      });

      // Should have queried database
      expect(prismaMock.member.findFirst).toHaveBeenCalledWith({
        where: { userId, organizationId: orgId },
        select: { role: true },
      });

      // Should cache the result
      expect(setCachedMembership).toHaveBeenCalledWith(userId, orgId, "member");
    });

    it("should return 403 when role does not match required roles", async () => {
      const { getServerSession } = await import("@/lib/auth-server");
      const { getCachedMembership } = await import("@/lib/membership-cache");

      vi.mocked(getServerSession).mockResolvedValueOnce(
        createMockSession(userId),
      );
      vi.mocked(getCachedMembership).mockResolvedValueOnce("member");

      const result = await withOrgMembership(orgId, ["owner", "admin"]);

      expect(result.response).not.toBeNull();
      expect(result.response?.status).toBe(403);
      expect(result.context).toBeNull();

      const json = await result.response?.json();
      expect(json.error.code).toBe("forbidden");
      expect(json.error.message).toContain("Insufficient permissions");
    });

    it("should allow access when role matches required roles", async () => {
      const { getServerSession } = await import("@/lib/auth-server");
      const { getCachedMembership } = await import("@/lib/membership-cache");

      vi.mocked(getServerSession).mockResolvedValueOnce(
        createMockSession(userId),
      );
      vi.mocked(getCachedMembership).mockResolvedValueOnce("admin");

      const result = await withOrgMembership(orgId, ["owner", "admin"]);

      expect(result.response).toBeNull();
      expect(result.context).toEqual({
        userId,
        orgId,
        role: "admin",
      });
    });

    it("should allow owner role when owner is in required roles", async () => {
      const { getServerSession } = await import("@/lib/auth-server");
      const { getCachedMembership } = await import("@/lib/membership-cache");

      vi.mocked(getServerSession).mockResolvedValueOnce(
        createMockSession(userId),
      );
      vi.mocked(getCachedMembership).mockResolvedValueOnce("owner");

      const result = await withOrgMembership(orgId, ["owner"]);

      expect(result.response).toBeNull();
      expect(result.context?.role).toBe("owner");
    });

    // Cross-organization access prevention test
    it("should prevent access to a different organization", async () => {
      const { getServerSession } = await import("@/lib/auth-server");
      const { getCachedMembership } = await import("@/lib/membership-cache");

      const targetOrg = "org-user-does-not-belong-to";

      vi.mocked(getServerSession).mockResolvedValueOnce(
        createMockSession(userId),
      );
      vi.mocked(getCachedMembership).mockResolvedValueOnce(null);
      prismaMock.member.findFirst.mockResolvedValueOnce(null);

      const result = await withOrgMembership(targetOrg);

      expect(result.response).not.toBeNull();
      expect(result.response?.status).toBe(403);
      expect(result.context).toBeNull();
    });
  });

  // ===========================================================================
  // withJobAccess
  // ===========================================================================
  describe("withJobAccess", () => {
    const jobId = "job-123";
    const orgId = "org-456";
    const userId = "user-789";

    it("should return 401 when not authenticated", async () => {
      const { getServerSession } = await import("@/lib/auth-server");
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      const result = await withJobAccess(jobId);

      expect(result.response).not.toBeNull();
      expect(result.response?.status).toBe(401);
      expect(result.context).toBeNull();
    });

    it("should return 422 when job not found", async () => {
      const { getServerSession } = await import("@/lib/auth-server");

      vi.mocked(getServerSession).mockResolvedValueOnce(
        createMockSession(userId),
      );
      prismaMock.job.findUnique.mockResolvedValueOnce(null);

      const result = await withJobAccess(jobId);

      expect(result.response).not.toBeNull();
      expect(result.response?.status).toBe(422);
      expect(result.context).toBeNull();

      const json = await result.response?.json();
      expect(json.error.code).toBe("not_found");
      expect(json.error.message).toContain("Job");
    });

    it("should return 403 when user is not a member of the job's organization", async () => {
      const { getServerSession } = await import("@/lib/auth-server");
      const { getCachedMembership } = await import("@/lib/membership-cache");

      const session = createMockSession(userId);
      vi.mocked(getServerSession)
        .mockResolvedValueOnce(session)
        .mockResolvedValueOnce(session);
      prismaMock.job.findUnique.mockResolvedValueOnce(mockJobData(orgId));
      vi.mocked(getCachedMembership).mockResolvedValueOnce(null);
      prismaMock.member.findFirst.mockResolvedValueOnce(null);

      const result = await withJobAccess(jobId);

      expect(result.response).not.toBeNull();
      expect(result.response?.status).toBe(403);
      expect(result.context).toBeNull();
    });

    it("should return context and jobOrgId when user is a member", async () => {
      const { getServerSession } = await import("@/lib/auth-server");
      const { getCachedMembership } = await import("@/lib/membership-cache");

      const session = createMockSession(userId);
      vi.mocked(getServerSession)
        .mockResolvedValueOnce(session)
        .mockResolvedValueOnce(session);
      prismaMock.job.findUnique.mockResolvedValueOnce(mockJobData(orgId));
      vi.mocked(getCachedMembership).mockResolvedValueOnce("member");

      const result = await withJobAccess(jobId);

      expect(result.response).toBeNull();
      expect(result.context).toEqual({
        userId,
        orgId,
        role: "member",
      });
      expect(result.jobOrgId).toBe(orgId);
    });

    it("should respect required roles for job access", async () => {
      const { getServerSession } = await import("@/lib/auth-server");
      const { getCachedMembership } = await import("@/lib/membership-cache");

      const session = createMockSession(userId);
      vi.mocked(getServerSession)
        .mockResolvedValueOnce(session)
        .mockResolvedValueOnce(session);
      prismaMock.job.findUnique.mockResolvedValueOnce(mockJobData(orgId));
      vi.mocked(getCachedMembership).mockResolvedValueOnce("member");

      const result = await withJobAccess(jobId, ["admin", "owner"]);

      expect(result.response).not.toBeNull();
      expect(result.response?.status).toBe(403);
    });

    it("should prevent access to a job from a different organization", async () => {
      const { getServerSession } = await import("@/lib/auth-server");
      const { getCachedMembership } = await import("@/lib/membership-cache");

      const jobOrgId = "org-job-belongs-to";

      const session = createMockSession(userId);
      vi.mocked(getServerSession)
        .mockResolvedValueOnce(session)
        .mockResolvedValueOnce(session);
      prismaMock.job.findUnique.mockResolvedValueOnce(mockJobData(jobOrgId));
      vi.mocked(getCachedMembership).mockResolvedValueOnce(null);
      prismaMock.member.findFirst.mockResolvedValueOnce(null);

      const result = await withJobAccess(jobId);

      expect(result.response).not.toBeNull();
      expect(result.response?.status).toBe(403);
      expect(result.context).toBeNull();
    });
  });

  // ===========================================================================
  // withInterviewAccess
  // ===========================================================================
  describe("withInterviewAccess", () => {
    const interviewId = "interview-123";
    const jobOrgId = "org-456";
    const candidateId = "candidate-789";
    const hrUserId = "hr-user-101";

    it("should return 401 when not authenticated", async () => {
      const { getServerSession } = await import("@/lib/auth-server");
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      const result = await withInterviewAccess(interviewId);

      expect(result.response).not.toBeNull();
      expect(result.response?.status).toBe(401);
      expect(result.context).toBeNull();
    });

    it("should return 422 when interview not found", async () => {
      const { getServerSession } = await import("@/lib/auth-server");

      vi.mocked(getServerSession).mockResolvedValueOnce(
        createMockSession(hrUserId),
      );
      prismaMock.interview.findUnique.mockResolvedValueOnce(null);

      const result = await withInterviewAccess(interviewId);

      expect(result.response).not.toBeNull();
      expect(result.response?.status).toBe(422);

      const json = await result.response?.json();
      expect(json.error.message).toContain("Interview");
    });

    it("should allow candidate access when allowCandidate=true", async () => {
      const { getServerSession } = await import("@/lib/auth-server");

      vi.mocked(getServerSession).mockResolvedValueOnce(
        createMockSession(candidateId),
      );
      prismaMock.interview.findUnique.mockResolvedValueOnce(
        mockInterviewData(candidateId, jobOrgId),
      );

      const result = await withInterviewAccess(interviewId, {
        allowCandidate: true,
      });

      expect(result.response).toBeNull();
      expect(result.isCandidate).toBe(true);
      expect(result.context?.userId).toBe(candidateId);
      expect(result.jobOrgId).toBe(jobOrgId);
    });

    it("should deny candidate access when allowCandidate=false", async () => {
      const { getServerSession } = await import("@/lib/auth-server");
      const { getCachedMembership } = await import("@/lib/membership-cache");

      const session = createMockSession(candidateId);
      vi.mocked(getServerSession)
        .mockResolvedValueOnce(session)
        .mockResolvedValueOnce(session);
      prismaMock.interview.findUnique.mockResolvedValueOnce(
        mockInterviewData(candidateId, jobOrgId),
      );
      vi.mocked(getCachedMembership).mockResolvedValueOnce(null);
      prismaMock.member.findFirst.mockResolvedValueOnce(null);

      const result = await withInterviewAccess(interviewId, {
        allowCandidate: false,
      });

      expect(result.response).not.toBeNull();
      expect(result.response?.status).toBe(403);
    });

    it("should allow HR access through organization membership", async () => {
      const { getServerSession } = await import("@/lib/auth-server");
      const { getCachedMembership } = await import("@/lib/membership-cache");

      const session = createMockSession(hrUserId);
      vi.mocked(getServerSession)
        .mockResolvedValueOnce(session)
        .mockResolvedValueOnce(session);
      prismaMock.interview.findUnique.mockResolvedValueOnce(
        mockInterviewData(candidateId, jobOrgId),
      );
      vi.mocked(getCachedMembership).mockResolvedValueOnce("admin");

      const result = await withInterviewAccess(interviewId);

      expect(result.response).toBeNull();
      expect(result.isCandidate).toBe(false);
      expect(result.context?.userId).toBe(hrUserId);
      expect(result.context?.role).toBe("admin");
      expect(result.jobOrgId).toBe(jobOrgId);
    });

    it("should respect requiredRoles for HR access", async () => {
      const { getServerSession } = await import("@/lib/auth-server");
      const { getCachedMembership } = await import("@/lib/membership-cache");

      const session = createMockSession(hrUserId);
      vi.mocked(getServerSession)
        .mockResolvedValueOnce(session)
        .mockResolvedValueOnce(session);
      prismaMock.interview.findUnique.mockResolvedValueOnce(
        mockInterviewData(candidateId, jobOrgId),
      );
      vi.mocked(getCachedMembership).mockResolvedValueOnce("member");

      const result = await withInterviewAccess(interviewId, {
        requiredRoles: ["admin", "owner"],
      });

      expect(result.response).not.toBeNull();
      expect(result.response?.status).toBe(403);
    });

    it("should deny access to user who is neither candidate nor org member", async () => {
      const { getServerSession } = await import("@/lib/auth-server");
      const { getCachedMembership } = await import("@/lib/membership-cache");

      const randomUserId = "random-user-999";

      const session = createMockSession(randomUserId);
      vi.mocked(getServerSession)
        .mockResolvedValueOnce(session)
        .mockResolvedValueOnce(session);
      prismaMock.interview.findUnique.mockResolvedValueOnce(
        mockInterviewData(candidateId, jobOrgId),
      );
      vi.mocked(getCachedMembership).mockResolvedValueOnce(null);
      prismaMock.member.findFirst.mockResolvedValueOnce(null);

      const result = await withInterviewAccess(interviewId, {
        allowCandidate: true,
      });

      expect(result.response).not.toBeNull();
      expect(result.response?.status).toBe(403);
    });

    it("should prevent HR from accessing interview of a different organization", async () => {
      const { getServerSession } = await import("@/lib/auth-server");
      const { getCachedMembership } = await import("@/lib/membership-cache");

      const session = createMockSession(hrUserId);
      vi.mocked(getServerSession)
        .mockResolvedValueOnce(session)
        .mockResolvedValueOnce(session);
      prismaMock.interview.findUnique.mockResolvedValueOnce(
        mockInterviewData("other-candidate", "different-org"),
      );
      vi.mocked(getCachedMembership).mockResolvedValueOnce(null);
      prismaMock.member.findFirst.mockResolvedValueOnce(null);

      const result = await withInterviewAccess(interviewId);

      expect(result.response).not.toBeNull();
      expect(result.response?.status).toBe(403);
    });
  });

  // ===========================================================================
  // withApplicationAccess
  // ===========================================================================
  describe("withApplicationAccess", () => {
    const applicationId = "app-123";
    const jobOrgId = "org-456";
    const applicantId = "applicant-789";
    const hrUserId = "hr-user-101";

    it("should return 401 when not authenticated", async () => {
      const { getServerSession } = await import("@/lib/auth-server");
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      const result = await withApplicationAccess(applicationId);

      expect(result.response).not.toBeNull();
      expect(result.response?.status).toBe(401);
      expect(result.context).toBeNull();
    });

    it("should return 422 when application not found", async () => {
      const { getServerSession } = await import("@/lib/auth-server");

      vi.mocked(getServerSession).mockResolvedValueOnce(
        createMockSession(hrUserId),
      );
      prismaMock.candidateApplication.findUnique.mockResolvedValueOnce(null);

      const result = await withApplicationAccess(applicationId);

      expect(result.response).not.toBeNull();
      expect(result.response?.status).toBe(422);

      const json = await result.response?.json();
      expect(json.error.message).toContain("Application");
    });

    it("should allow applicant access when allowCandidate=true", async () => {
      const { getServerSession } = await import("@/lib/auth-server");

      vi.mocked(getServerSession).mockResolvedValueOnce(
        createMockSession(applicantId),
      );
      prismaMock.candidateApplication.findUnique.mockResolvedValueOnce(
        mockApplicationData(applicantId, jobOrgId),
      );

      const result = await withApplicationAccess(applicationId, {
        allowCandidate: true,
      });

      expect(result.response).toBeNull();
      expect(result.isCandidate).toBe(true);
      expect(result.context?.userId).toBe(applicantId);
      expect(result.jobOrgId).toBe(jobOrgId);
    });

    it("should deny applicant access when allowCandidate=false", async () => {
      const { getServerSession } = await import("@/lib/auth-server");
      const { getCachedMembership } = await import("@/lib/membership-cache");

      const session = createMockSession(applicantId);
      vi.mocked(getServerSession)
        .mockResolvedValueOnce(session)
        .mockResolvedValueOnce(session);
      prismaMock.candidateApplication.findUnique.mockResolvedValueOnce(
        mockApplicationData(applicantId, jobOrgId),
      );
      vi.mocked(getCachedMembership).mockResolvedValueOnce(null);
      prismaMock.member.findFirst.mockResolvedValueOnce(null);

      const result = await withApplicationAccess(applicationId, {
        allowCandidate: false,
      });

      expect(result.response).not.toBeNull();
      expect(result.response?.status).toBe(403);
    });

    it("should allow HR access through organization membership", async () => {
      const { getServerSession } = await import("@/lib/auth-server");
      const { getCachedMembership } = await import("@/lib/membership-cache");

      const session = createMockSession(hrUserId);
      vi.mocked(getServerSession)
        .mockResolvedValueOnce(session)
        .mockResolvedValueOnce(session);
      prismaMock.candidateApplication.findUnique.mockResolvedValueOnce(
        mockApplicationData(applicantId, jobOrgId),
      );
      vi.mocked(getCachedMembership).mockResolvedValueOnce("admin");

      const result = await withApplicationAccess(applicationId);

      expect(result.response).toBeNull();
      expect(result.isCandidate).toBe(false);
      expect(result.context?.userId).toBe(hrUserId);
      expect(result.context?.role).toBe("admin");
      expect(result.jobOrgId).toBe(jobOrgId);
    });

    it("should respect requiredRoles for HR access", async () => {
      const { getServerSession } = await import("@/lib/auth-server");
      const { getCachedMembership } = await import("@/lib/membership-cache");

      const session = createMockSession(hrUserId);
      vi.mocked(getServerSession)
        .mockResolvedValueOnce(session)
        .mockResolvedValueOnce(session);
      prismaMock.candidateApplication.findUnique.mockResolvedValueOnce(
        mockApplicationData(applicantId, jobOrgId),
      );
      vi.mocked(getCachedMembership).mockResolvedValueOnce("member");

      const result = await withApplicationAccess(applicationId, {
        requiredRoles: ["admin", "owner"],
      });

      expect(result.response).not.toBeNull();
      expect(result.response?.status).toBe(403);
    });

    it("should prevent HR from accessing application of a different organization", async () => {
      const { getServerSession } = await import("@/lib/auth-server");
      const { getCachedMembership } = await import("@/lib/membership-cache");

      const session = createMockSession(hrUserId);
      vi.mocked(getServerSession)
        .mockResolvedValueOnce(session)
        .mockResolvedValueOnce(session);
      prismaMock.candidateApplication.findUnique.mockResolvedValueOnce(
        mockApplicationData("other-applicant", "different-org"),
      );
      vi.mocked(getCachedMembership).mockResolvedValueOnce(null);
      prismaMock.member.findFirst.mockResolvedValueOnce(null);

      const result = await withApplicationAccess(applicationId);

      expect(result.response).not.toBeNull();
      expect(result.response?.status).toBe(403);
    });

    it("should deny access to user who is neither applicant nor org member", async () => {
      const { getServerSession } = await import("@/lib/auth-server");
      const { getCachedMembership } = await import("@/lib/membership-cache");

      const randomUserId = "random-user-999";

      const session = createMockSession(randomUserId);
      vi.mocked(getServerSession)
        .mockResolvedValueOnce(session)
        .mockResolvedValueOnce(session);
      prismaMock.candidateApplication.findUnique.mockResolvedValueOnce(
        mockApplicationData(applicantId, jobOrgId),
      );
      vi.mocked(getCachedMembership).mockResolvedValueOnce(null);
      prismaMock.member.findFirst.mockResolvedValueOnce(null);

      const result = await withApplicationAccess(applicationId, {
        allowCandidate: true,
      });

      expect(result.response).not.toBeNull();
      expect(result.response?.status).toBe(403);
    });
  });

  // ===========================================================================
  // Cross-Organization Security Tests
  // ===========================================================================
  describe("Cross-Organization Security", () => {
    it("should prevent user from org A accessing job from org B", async () => {
      const { getServerSession } = await import("@/lib/auth-server");
      const { getCachedMembership } = await import("@/lib/membership-cache");

      const userFromOrgA = "user-org-a";
      const orgB = "org-b";

      const session = createMockSession(userFromOrgA);
      vi.mocked(getServerSession)
        .mockResolvedValueOnce(session)
        .mockResolvedValueOnce(session);
      prismaMock.job.findUnique.mockResolvedValueOnce(mockJobData(orgB));
      vi.mocked(getCachedMembership).mockResolvedValueOnce(null);
      prismaMock.member.findFirst.mockResolvedValueOnce(null);

      const result = await withJobAccess("job-in-org-b");

      expect(result.response?.status).toBe(403);
      expect(result.context).toBeNull();
    });

    it("should prevent user from org A viewing interview from org B", async () => {
      const { getServerSession } = await import("@/lib/auth-server");
      const { getCachedMembership } = await import("@/lib/membership-cache");

      const userFromOrgA = "user-org-a";

      const session = createMockSession(userFromOrgA);
      vi.mocked(getServerSession)
        .mockResolvedValueOnce(session)
        .mockResolvedValueOnce(session);
      prismaMock.interview.findUnique.mockResolvedValueOnce(
        mockInterviewData("some-candidate", "org-b"),
      );
      vi.mocked(getCachedMembership).mockResolvedValueOnce(null);
      prismaMock.member.findFirst.mockResolvedValueOnce(null);

      const result = await withInterviewAccess("interview-in-org-b");

      expect(result.response?.status).toBe(403);
      expect(result.context).toBeNull();
    });

    it("should prevent user from org A viewing application from org B", async () => {
      const { getServerSession } = await import("@/lib/auth-server");
      const { getCachedMembership } = await import("@/lib/membership-cache");

      const userFromOrgA = "user-org-a";

      const session = createMockSession(userFromOrgA);
      vi.mocked(getServerSession)
        .mockResolvedValueOnce(session)
        .mockResolvedValueOnce(session);
      prismaMock.candidateApplication.findUnique.mockResolvedValueOnce(
        mockApplicationData("some-applicant", "org-b"),
      );
      vi.mocked(getCachedMembership).mockResolvedValueOnce(null);
      prismaMock.member.findFirst.mockResolvedValueOnce(null);

      const result = await withApplicationAccess("app-in-org-b");

      expect(result.response?.status).toBe(403);
      expect(result.context).toBeNull();
    });

    it("should allow access when user is member of the correct organization", async () => {
      const { getServerSession } = await import("@/lib/auth-server");
      const { getCachedMembership } = await import("@/lib/membership-cache");

      const userFromOrgB = "user-org-b";
      const orgB = "org-b";

      const session = createMockSession(userFromOrgB);
      vi.mocked(getServerSession)
        .mockResolvedValueOnce(session)
        .mockResolvedValueOnce(session);
      prismaMock.job.findUnique.mockResolvedValueOnce(mockJobData(orgB));
      vi.mocked(getCachedMembership).mockResolvedValueOnce("member");

      const result = await withJobAccess("job-in-org-b");

      expect(result.response).toBeNull();
      expect(result.context?.orgId).toBe(orgB);
    });
  });
});
