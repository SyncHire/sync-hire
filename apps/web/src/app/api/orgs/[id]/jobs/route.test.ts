/**
 * Tests for GET /api/orgs/:id/jobs
 *
 * Tests organization jobs endpoint with authentication and membership checks.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import {
  createTestRequest,
  createRouteParams,
} from "../../../../../../test/helpers/api-test-helpers";

// Mock auth-server
vi.mock("@/lib/auth-server", () => ({
  requireAuth: vi.fn(),
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

describe("GET /api/orgs/:id/jobs", () => {
  const orgId = "org-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 403 when user is not a member of the organization", async () => {
    const { requireAuth } = await import("@/lib/auth-server");
    const { prisma } = await import("@sync-hire/database");

    // Mock authenticated user
    vi.mocked(requireAuth).mockResolvedValueOnce({
      user: { id: "user-456", name: "Test User", email: "test@example.com" },
      session: { id: "session-1", activeOrganizationId: null },
    } as Awaited<ReturnType<typeof requireAuth>>);

    // Mock no membership
    vi.mocked(prisma.member.findFirst).mockResolvedValueOnce(null);

    const request = createTestRequest(`/api/orgs/${orgId}/jobs`);
    const params = createRouteParams({ id: orgId });

    const response = await GET(request, params);
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.success).toBe(false);
    expect(json.error).toContain("not a member");
  });

  it("should return jobs for authenticated org member", async () => {
    const { requireAuth } = await import("@/lib/auth-server");
    const { prisma } = await import("@sync-hire/database");
    const { getAllJobsData } = await import("@/lib/server-utils/get-jobs");

    // Mock authenticated user
    vi.mocked(requireAuth).mockResolvedValueOnce({
      user: { id: "user-456", name: "Test User", email: "test@example.com" },
      session: { id: "session-1", activeOrganizationId: orgId },
    } as Awaited<ReturnType<typeof requireAuth>>);

    // Mock membership exists
    vi.mocked(prisma.member.findFirst).mockResolvedValueOnce({
      id: "member-1",
      userId: "user-456",
      organizationId: orgId,
      role: "member",
      createdAt: new Date(),
    });

    // Mock jobs data
    vi.mocked(getAllJobsData).mockResolvedValueOnce([
      {
        id: "job-1",
        title: "Senior Engineer",
        location: "Remote",
        status: "ACTIVE",
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

  it("should return 500 when requireAuth throws", async () => {
    const { requireAuth } = await import("@/lib/auth-server");

    // Mock auth failure
    vi.mocked(requireAuth).mockRejectedValueOnce(new Error("Unauthorized"));

    const request = createTestRequest(`/api/orgs/${orgId}/jobs`);
    const params = createRouteParams({ id: orgId });

    const response = await GET(request, params);
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.success).toBe(false);
    expect(json.error).toBe("Unauthorized");
  });
});
