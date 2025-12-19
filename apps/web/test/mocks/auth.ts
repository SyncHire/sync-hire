/**
 * Auth Mocks for Testing
 *
 * Mocks Better Auth session for API route testing.
 */

import { vi } from "vitest";

interface MockSessionOptions {
  userId?: string;
  userName?: string;
  userEmail?: string;
  activeOrganizationId?: string | null;
}

/**
 * Creates a mock session object matching Better Auth structure
 */
export function createMockSession(options: MockSessionOptions = {}) {
  const {
    userId = "test-user-id",
    userName = "Test User",
    userEmail = "test@example.com",
    activeOrganizationId = null,
  } = options;

  return {
    user: {
      id: userId,
      name: userName,
      email: userEmail,
      emailVerified: true,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    session: {
      id: "test-session-id",
      userId,
      token: "test-token",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      ipAddress: "127.0.0.1",
      userAgent: "vitest",
      activeOrganizationId,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };
}

/**
 * Sets up auth mocks for a test - mocks @/lib/auth-server module
 *
 * @example
 * ```ts
 * import { setupAuthMocks } from '@/test/mocks/auth';
 *
 * beforeEach(() => {
 *   setupAuthMocks({ userId: 'user-123', activeOrganizationId: 'org-456' });
 * });
 * ```
 */
export function setupAuthMocks(sessionOptions: MockSessionOptions = {}) {
  const mockSession = createMockSession(sessionOptions);

  vi.mock("@/lib/auth-server", () => ({
    getServerSession: vi.fn().mockResolvedValue(mockSession),
    getValidatedSession: vi.fn().mockResolvedValue(mockSession),
    requireAuth: vi.fn().mockResolvedValue(mockSession),
    requireOrgMembership: vi.fn().mockResolvedValue(mockSession),
    getCurrentUserId: vi.fn().mockResolvedValue(mockSession.user.id),
    getActiveOrganizationId: vi
      .fn()
      .mockResolvedValue(mockSession.session.activeOrganizationId),
  }));

  return mockSession;
}

/**
 * Creates an unauthenticated mock - requireAuth throws
 */
export function setupUnauthenticatedMocks() {
  vi.mock("@/lib/auth-server", () => ({
    getServerSession: vi.fn().mockResolvedValue(null),
    getValidatedSession: vi.fn().mockResolvedValue(null),
    requireAuth: vi.fn().mockRejectedValue(new Error("Unauthorized")),
    requireOrgMembership: vi.fn().mockRejectedValue(new Error("Unauthorized")),
    getCurrentUserId: vi.fn().mockResolvedValue(null),
    getActiveOrganizationId: vi.fn().mockResolvedValue(null),
  }));
}
