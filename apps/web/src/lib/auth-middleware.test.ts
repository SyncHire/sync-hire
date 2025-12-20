/**
 * Tests for auth-middleware.ts
 *
 * Security-critical tests covering authentication, authorization,
 * role-based access control, and cross-organization access prevention.
 */

import { prismaMock } from "@test/__mocks__/prisma";
import {
  expectForbidden,
  expectNotFound,
  expectSuccess,
  expectUnauthorized,
  mockApplication,
  mockInterview,
  mockJobOrg,
  mockMembership,
  setupAuthenticated,
  setupMember,
  setupMemberTwice,
  setupNonMember,
  setupNonMemberTwice,
  setupUnauthenticated,
} from "@test/fixtures/auth";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  withApplicationAccess,
  withAuth,
  withInterviewAccess,
  withJobAccess,
  withOrgMembership,
} from "./auth-middleware";

// Mock dependencies
vi.mock("@/lib/auth-server", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/membership-cache", () => ({
  getCachedMembership: vi.fn(),
  setCachedMembership: vi.fn(),
}));
vi.mock("@sync-hire/database", async () => {
  const { prismaMock } = await import("@test/__mocks__/prisma");
  return { prisma: prismaMock };
});

describe("auth-middleware", () => {
  beforeEach(() => vi.clearAllMocks());

  // ===========================================================================
  // withAuth
  // ===========================================================================
  describe("withAuth", () => {
    it("returns 401 when not authenticated", async () => {
      await setupUnauthenticated();
      const result = await withAuth();
      await expectUnauthorized(result.response);
      expect(result.userId).toBeNull();
    });

    it("returns userId when authenticated", async () => {
      await setupAuthenticated("user-123");
      const result = await withAuth();
      expectSuccess(result.response);
      expect(result.userId).toBe("user-123");
    });
  });

  // ===========================================================================
  // withOrgMembership
  // ===========================================================================
  describe("withOrgMembership", () => {
    const orgId = "org-123";
    const userId = "user-456";

    it("returns 401 when not authenticated", async () => {
      await setupUnauthenticated();
      const result = await withOrgMembership(orgId);
      await expectUnauthorized(result.response);
    });

    it("returns 403 when user is not a member", async () => {
      await setupNonMember(userId);
      const result = await withOrgMembership(orgId);
      await expectForbidden(result.response, "Not a member");
    });

    it("returns context on cache hit", async () => {
      await setupMember(userId, "admin");
      const result = await withOrgMembership(orgId);
      expectSuccess(result.response);
      expect(result.context).toEqual({ userId, orgId, role: "admin" });
      expect(prismaMock.member.findFirst).not.toHaveBeenCalled();
    });

    it("queries database on cache miss and caches result", async () => {
      const { getServerSession } = await import("@/lib/auth-server");
      const { getCachedMembership, setCachedMembership } = await import(
        "@/lib/membership-cache"
      );

      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: userId, name: "Test", email: "test@example.com" },
        session: { id: "s1", activeOrganizationId: null },
      } as Awaited<ReturnType<typeof getServerSession>>);
      vi.mocked(getCachedMembership).mockResolvedValueOnce(null);
      prismaMock.member.findFirst.mockResolvedValueOnce(
        mockMembership(userId, orgId, "member"),
      );

      const result = await withOrgMembership(orgId);

      expectSuccess(result.response);
      expect(result.context?.role).toBe("member");
      expect(setCachedMembership).toHaveBeenCalledWith(userId, orgId, "member");
    });

    it("returns 403 when role does not match required roles", async () => {
      await setupMember(userId, "member");
      const result = await withOrgMembership(orgId, ["owner", "admin"]);
      await expectForbidden(result.response, "Insufficient permissions");
    });

    it("allows access when role matches required roles", async () => {
      await setupMember(userId, "admin");
      const result = await withOrgMembership(orgId, ["owner", "admin"]);
      expectSuccess(result.response);
      expect(result.context?.role).toBe("admin");
    });
  });

  // ===========================================================================
  // withJobAccess
  // ===========================================================================
  describe("withJobAccess", () => {
    const jobId = "job-123";
    const orgId = "org-456";
    const userId = "user-789";

    it("returns 401 when not authenticated", async () => {
      await setupUnauthenticated();
      const result = await withJobAccess(jobId);
      await expectUnauthorized(result.response);
    });

    it("returns 422 when job not found", async () => {
      await setupAuthenticated(userId);
      prismaMock.job.findUnique.mockResolvedValueOnce(null);
      const result = await withJobAccess(jobId);
      await expectNotFound(result.response, "Job");
    });

    it("returns 403 when user is not a member of job's organization", async () => {
      await setupNonMemberTwice(userId);
      prismaMock.job.findUnique.mockResolvedValueOnce(mockJobOrg(orgId));
      const result = await withJobAccess(jobId);
      expect(result.response?.status).toBe(403);
    });

    it("returns context and jobOrgId when user is a member", async () => {
      await setupMemberTwice(userId, "member");
      prismaMock.job.findUnique.mockResolvedValueOnce(mockJobOrg(orgId));
      const result = await withJobAccess(jobId);
      expectSuccess(result.response);
      expect(result.context).toEqual({ userId, orgId, role: "member" });
      expect(result.jobOrgId).toBe(orgId);
    });

    it("respects required roles", async () => {
      await setupMemberTwice(userId, "member");
      prismaMock.job.findUnique.mockResolvedValueOnce(mockJobOrg(orgId));
      const result = await withJobAccess(jobId, ["admin", "owner"]);
      expect(result.response?.status).toBe(403);
    });
  });

  // ===========================================================================
  // withInterviewAccess
  // ===========================================================================
  describe("withInterviewAccess", () => {
    const interviewId = "interview-123";
    const orgId = "org-456";
    const candidateId = "candidate-789";
    const hrUserId = "hr-101";

    it("returns 401 when not authenticated", async () => {
      await setupUnauthenticated();
      const result = await withInterviewAccess(interviewId);
      await expectUnauthorized(result.response);
    });

    it("returns 422 when interview not found", async () => {
      await setupAuthenticated(hrUserId);
      prismaMock.interview.findUnique.mockResolvedValueOnce(null);
      const result = await withInterviewAccess(interviewId);
      await expectNotFound(result.response, "Interview");
    });

    it("allows candidate access when allowCandidate=true", async () => {
      await setupAuthenticated(candidateId);
      prismaMock.interview.findUnique.mockResolvedValueOnce(
        mockInterview(candidateId, orgId),
      );
      const result = await withInterviewAccess(interviewId, {
        allowCandidate: true,
      });
      expectSuccess(result.response);
      expect(result.isCandidate).toBe(true);
      expect(result.jobOrgId).toBe(orgId);
    });

    it("denies candidate access when allowCandidate=false", async () => {
      await setupNonMemberTwice(candidateId);
      prismaMock.interview.findUnique.mockResolvedValueOnce(
        mockInterview(candidateId, orgId),
      );
      const result = await withInterviewAccess(interviewId, {
        allowCandidate: false,
      });
      expect(result.response?.status).toBe(403);
    });

    it("allows HR access through organization membership", async () => {
      await setupMemberTwice(hrUserId, "admin");
      prismaMock.interview.findUnique.mockResolvedValueOnce(
        mockInterview(candidateId, orgId),
      );
      const result = await withInterviewAccess(interviewId);
      expectSuccess(result.response);
      expect(result.isCandidate).toBe(false);
      expect(result.context?.role).toBe("admin");
    });

    it("respects requiredRoles for HR access", async () => {
      await setupMemberTwice(hrUserId, "member");
      prismaMock.interview.findUnique.mockResolvedValueOnce(
        mockInterview(candidateId, orgId),
      );
      const result = await withInterviewAccess(interviewId, {
        requiredRoles: ["admin", "owner"],
      });
      expect(result.response?.status).toBe(403);
    });

    it("denies access to user who is neither candidate nor org member", async () => {
      await setupNonMemberTwice("random-user");
      prismaMock.interview.findUnique.mockResolvedValueOnce(
        mockInterview(candidateId, orgId),
      );
      const result = await withInterviewAccess(interviewId, {
        allowCandidate: true,
      });
      expect(result.response?.status).toBe(403);
    });
  });

  // ===========================================================================
  // withApplicationAccess
  // ===========================================================================
  describe("withApplicationAccess", () => {
    const appId = "app-123";
    const orgId = "org-456";
    const applicantId = "applicant-789";
    const hrUserId = "hr-101";

    it("returns 401 when not authenticated", async () => {
      await setupUnauthenticated();
      const result = await withApplicationAccess(appId);
      await expectUnauthorized(result.response);
    });

    it("returns 422 when application not found", async () => {
      await setupAuthenticated(hrUserId);
      prismaMock.candidateApplication.findUnique.mockResolvedValueOnce(null);
      const result = await withApplicationAccess(appId);
      await expectNotFound(result.response, "Application");
    });

    it("allows applicant access when allowCandidate=true", async () => {
      await setupAuthenticated(applicantId);
      prismaMock.candidateApplication.findUnique.mockResolvedValueOnce(
        mockApplication(applicantId, orgId),
      );
      const result = await withApplicationAccess(appId, {
        allowCandidate: true,
      });
      expectSuccess(result.response);
      expect(result.isCandidate).toBe(true);
      expect(result.jobOrgId).toBe(orgId);
    });

    it("denies applicant access when allowCandidate=false", async () => {
      await setupNonMemberTwice(applicantId);
      prismaMock.candidateApplication.findUnique.mockResolvedValueOnce(
        mockApplication(applicantId, orgId),
      );
      const result = await withApplicationAccess(appId, {
        allowCandidate: false,
      });
      expect(result.response?.status).toBe(403);
    });

    it("allows HR access through organization membership", async () => {
      await setupMemberTwice(hrUserId, "admin");
      prismaMock.candidateApplication.findUnique.mockResolvedValueOnce(
        mockApplication(applicantId, orgId),
      );
      const result = await withApplicationAccess(appId);
      expectSuccess(result.response);
      expect(result.isCandidate).toBe(false);
      expect(result.context?.role).toBe("admin");
    });

    it("respects requiredRoles for HR access", async () => {
      await setupMemberTwice(hrUserId, "member");
      prismaMock.candidateApplication.findUnique.mockResolvedValueOnce(
        mockApplication(applicantId, orgId),
      );
      const result = await withApplicationAccess(appId, {
        requiredRoles: ["admin", "owner"],
      });
      expect(result.response?.status).toBe(403);
    });

    it("denies access to user who is neither applicant nor org member", async () => {
      await setupNonMemberTwice("random-user");
      prismaMock.candidateApplication.findUnique.mockResolvedValueOnce(
        mockApplication(applicantId, orgId),
      );
      const result = await withApplicationAccess(appId, {
        allowCandidate: true,
      });
      expect(result.response?.status).toBe(403);
    });
  });

  // ===========================================================================
  // Cross-Organization Security
  // ===========================================================================
  describe("Cross-Organization Security", () => {
    it("prevents user from org A accessing job from org B", async () => {
      await setupNonMemberTwice("user-org-a");
      prismaMock.job.findUnique.mockResolvedValueOnce(mockJobOrg("org-b"));
      const result = await withJobAccess("job-in-org-b");
      expect(result.response?.status).toBe(403);
    });

    it("prevents user from org A viewing interview from org B", async () => {
      await setupNonMemberTwice("user-org-a");
      prismaMock.interview.findUnique.mockResolvedValueOnce(
        mockInterview("candidate", "org-b"),
      );
      const result = await withInterviewAccess("interview-in-org-b");
      expect(result.response?.status).toBe(403);
    });

    it("prevents user from org A viewing application from org B", async () => {
      await setupNonMemberTwice("user-org-a");
      prismaMock.candidateApplication.findUnique.mockResolvedValueOnce(
        mockApplication("applicant", "org-b"),
      );
      const result = await withApplicationAccess("app-in-org-b");
      expect(result.response?.status).toBe(403);
    });

    it("allows access when user is member of the correct organization", async () => {
      await setupMemberTwice("user-org-b", "member");
      prismaMock.job.findUnique.mockResolvedValueOnce(mockJobOrg("org-b"));
      const result = await withJobAccess("job-in-org-b");
      expectSuccess(result.response);
      expect(result.context?.orgId).toBe("org-b");
    });
  });
});
