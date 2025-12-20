/**
 * Auth Test Fixtures
 *
 * Shared utilities for testing auth-related functionality.
 */

import type { OrgMemberRole } from "@sync-hire/database";
import { prismaMock } from "@test/__mocks__/prisma";
import { expect, vi } from "vitest";

// =============================================================================
// Types
// =============================================================================

type Session = Awaited<
  ReturnType<typeof import("@/lib/auth-server").getServerSession>
>;

// =============================================================================
// Mock Factories
// =============================================================================

/** Create a mock session */
export const mockSession = (
  userId: string,
  activeOrgId: string | null = null,
): Session =>
  ({
    user: { id: userId, name: "Test User", email: "test@example.com" },
    session: { id: "session-1", activeOrganizationId: activeOrgId },
  }) as Session;

/** Create mock membership record */
export const mockMembership = (
  userId: string,
  orgId: string,
  role: OrgMemberRole,
) => ({
  id: `member-${userId}-${orgId}`,
  userId,
  organizationId: orgId,
  role,
  createdAt: new Date(),
  updatedAt: new Date(),
});

/** Partial mock data for Prisma select queries */
export const mockJobOrg = (orgId: string) =>
  ({ organizationId: orgId }) as never;

export const mockInterview = (candidateId: string, orgId: string) =>
  ({ candidateId, job: { organizationId: orgId } }) as never;

export const mockApplication = (userId: string, orgId: string) =>
  ({ userId, job: { organizationId: orgId } }) as never;

// =============================================================================
// Auth Mock Setup
// =============================================================================

type AuthMocks = {
  getServerSession: ReturnType<typeof vi.fn>;
  getCachedMembership: ReturnType<typeof vi.fn>;
  setCachedMembership: ReturnType<typeof vi.fn>;
};

let authMocks: AuthMocks | null = null;

/** Get auth mocks (lazy initialized) */
export async function getAuthMocks(): Promise<AuthMocks> {
  if (!authMocks) {
    const authServer = await import("@/lib/auth-server");
    const cache = await import("@/lib/membership-cache");
    authMocks = {
      getServerSession: vi.mocked(authServer.getServerSession),
      getCachedMembership: vi.mocked(cache.getCachedMembership),
      setCachedMembership: vi.mocked(cache.setCachedMembership),
    };
  }
  return authMocks;
}

/** Setup: user is not authenticated */
export async function setupUnauthenticated(): Promise<void> {
  const { getServerSession } = await getAuthMocks();
  getServerSession.mockResolvedValueOnce(null);
}

/** Setup: user is authenticated */
export async function setupAuthenticated(userId: string): Promise<void> {
  const { getServerSession } = await getAuthMocks();
  getServerSession.mockResolvedValueOnce(mockSession(userId));
}

/** Setup: user is authenticated (for nested auth checks that call getServerSession twice) */
export async function setupAuthenticatedTwice(userId: string): Promise<void> {
  const { getServerSession } = await getAuthMocks();
  const session = mockSession(userId);
  getServerSession
    .mockResolvedValueOnce(session)
    .mockResolvedValueOnce(session);
}

/** Setup: user is member of org with role (from cache) */
export async function setupMember(
  userId: string,
  role: OrgMemberRole,
): Promise<void> {
  const { getServerSession, getCachedMembership } = await getAuthMocks();
  getServerSession.mockResolvedValueOnce(mockSession(userId));
  getCachedMembership.mockResolvedValueOnce(role);
}

/** Setup: user is member (for nested calls) */
export async function setupMemberTwice(
  userId: string,
  role: OrgMemberRole,
): Promise<void> {
  const { getServerSession, getCachedMembership } = await getAuthMocks();
  const session = mockSession(userId);
  getServerSession
    .mockResolvedValueOnce(session)
    .mockResolvedValueOnce(session);
  getCachedMembership.mockResolvedValueOnce(role);
}

/** Setup: user is not a member of org */
export async function setupNonMember(userId: string): Promise<void> {
  const { getServerSession, getCachedMembership } = await getAuthMocks();
  getServerSession.mockResolvedValueOnce(mockSession(userId));
  getCachedMembership.mockResolvedValueOnce(null);
  prismaMock.member.findFirst.mockResolvedValueOnce(null);
}

/** Setup: user is not a member (for nested calls) */
export async function setupNonMemberTwice(userId: string): Promise<void> {
  const { getServerSession, getCachedMembership } = await getAuthMocks();
  const session = mockSession(userId);
  getServerSession
    .mockResolvedValueOnce(session)
    .mockResolvedValueOnce(session);
  getCachedMembership.mockResolvedValueOnce(null);
  prismaMock.member.findFirst.mockResolvedValueOnce(null);
}

// =============================================================================
// Response Assertions
// =============================================================================

/** Assert response is 401 Unauthorized */
export async function expectUnauthorized(
  response: Response | null,
): Promise<void> {
  expect(response).not.toBeNull();
  expect(response?.status).toBe(401);
  const json = await response?.json();
  expect(json.error.code).toBe("unauthorized");
}

/** Assert response is 403 Forbidden */
export async function expectForbidden(
  response: Response | null,
  messageContains?: string,
): Promise<void> {
  expect(response).not.toBeNull();
  expect(response?.status).toBe(403);
  const json = await response?.json();
  expect(json.error.code).toBe("forbidden");
  if (messageContains) {
    expect(json.error.message).toContain(messageContains);
  }
}

/** Assert response is 422 Not Found */
export async function expectNotFound(
  response: Response | null,
  resourceName: string,
): Promise<void> {
  expect(response).not.toBeNull();
  expect(response?.status).toBe(422);
  const json = await response?.json();
  expect(json.error.code).toBe("not_found");
  expect(json.error.message).toContain(resourceName);
}

/** Assert successful result (no error response) */
export function expectSuccess(response: Response | null): void {
  expect(response).toBeNull();
}
