/**
 * Tests for GET /api/orgs/:id/jobs
 *
 * Tests organization jobs endpoint with authentication and membership checks.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createRouteParams,
  createTestRequest,
} from "../../../../../../test/helpers/api-test-helpers";
import { GET } from "./route";

// Mock auth-server (withOrgMembership uses getServerSession)
vi.mock("@/lib/auth-server", () => ({
  getServerSession: vi.fn(),
}));

// Mock membership cache
vi.mock("@/lib/membership-cache", () => ({
  getCachedMembership: vi.fn().mockResolvedValue(null),
  setCachedMembership: vi.fn().mockResolvedValue(undefined),
}));

// Mock prisma
vi.mock("@sync-hire/database", () => ({
  prisma: {
    member: {
      findFirst: vi.fn(),
    },
  },
}));

// Mock server-utils
vi.mock("@/lib/server-utils/get-jobs", () => ({
  getAllJobsData: vi.fn(),
}));

// Mock logger to avoid noise
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("GET /api/orgs/:id/jobs", () => {
  const orgId = "org-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 403 when user is not a member of the organization", async () => {
    const { getServerSession } = await import("@/lib/auth-server");
    const { prisma } = await import("@sync-hire/database");

    // Mock authenticated session
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: "user-456", name: "Test User", email: "test@example.com" },
      session: { id: "session-1", activeOrganizationId: null },
    } as Awaited<ReturnType<typeof getServerSession>>);

    // Mock no membership
    vi.mocked(prisma.member.findFirst).mockResolvedValueOnce(null);

    const request = createTestRequest(`/api/orgs/${orgId}/jobs`);
    const params = createRouteParams({ id: orgId });

    const response = await GET(request, params);
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.error).toBeDefined();
    expect(json.error.message).toContain("Not a member");
  });

  it("should return jobs for authenticated org member", async () => {
    const { getServerSession } = await import("@/lib/auth-server");
    const { prisma } = await import("@sync-hire/database");
    const { getAllJobsData } = await import("@/lib/server-utils/get-jobs");

    // Mock authenticated session
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: "user-456", name: "Test User", email: "test@example.com" },
      session: { id: "session-1", activeOrganizationId: orgId },
    } as Awaited<ReturnType<typeof getServerSession>>);

    // Mock membership exists
    vi.mocked(prisma.member.findFirst).mockResolvedValueOnce({
      id: "member-1",
      userId: "user-456",
      organizationId: orgId,
      role: "member",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Mock jobs data
    vi.mocked(getAllJobsData).mockResolvedValueOnce([
      {
        id: "job-1",
        title: "Senior Engineer",
        location: "Remote",
        status: "ACTIVE",
        organization: {
          id: orgId,
          name: "Test Org",
          slug: "test-org",
          description: null,
          logo: null,
          website: null,
          industry: null,
          size: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        questions: [],
        applicantsCount: 0,
        organizationId: orgId,
        createdById: "user-456",
        department: null,
        employmentType: "Full-time",
        workArrangement: "Remote",
        salary: null,
        description: "Test description",
        requirements: [],
        aiMatchingEnabled: true,
        aiMatchingThreshold: 70,
        aiMatchingStatus: "DISABLED",
        jdFileUrl: null,
        jdFileHash: null,
        jdExtraction: null,
        jdVersion: null,
        postedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const request = createTestRequest(`/api/orgs/${orgId}/jobs`);
    const params = createRouteParams({ id: orgId });

    const response = await GET(request, params);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].title).toBe("Senior Engineer");
  });

  it("should return 401 when not authenticated", async () => {
    const { getServerSession } = await import("@/lib/auth-server");

    // Mock no session (not authenticated)
    vi.mocked(getServerSession).mockResolvedValueOnce(null);

    const request = createTestRequest(`/api/orgs/${orgId}/jobs`);
    const params = createRouteParams({ id: orgId });

    const response = await GET(request, params);
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error).toBeDefined();
    expect(json.error.code).toBe("unauthorized");
  });
});
