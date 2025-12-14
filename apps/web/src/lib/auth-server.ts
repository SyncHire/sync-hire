/**
 * Better Auth Server Utilities
 *
 * Server-side session helpers for API routes and server components.
 * Best practice: Use these in pages/API routes, not middleware.
 */

import { headers } from "next/headers";
import { auth } from "./auth";

/**
 * Get session with cookie caching (fast, uses cache)
 * Use for most read operations
 */
export async function getServerSession() {
  return auth.api.getSession({ headers: await headers() });
}

/**
 * Get session with forced DB validation (slower, bypasses cache)
 * Use for sensitive operations like password change, deletion
 */
export async function getValidatedSession() {
  return auth.api.getSession({
    headers: await headers(),
    query: { disableCookieCache: true },
  });
}

/**
 * Require authenticated session - throws if not logged in
 */
export async function requireAuth() {
  const session = await getServerSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}

/**
 * Require active organization - throws if no org selected
 * Use for HR routes that need organization context
 */
export async function requireOrgMembership() {
  const session = await requireAuth();
  if (!session.session.activeOrganizationId) {
    throw new Error("No active organization");
  }
  return session;
}

/**
 * Get the current user ID from session
 * Returns null if not authenticated
 */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await getServerSession();
  return session?.user?.id ?? null;
}

/**
 * Get the active organization ID from session
 * Returns null if not authenticated or no org selected
 */
export async function getActiveOrganizationId(): Promise<string | null> {
  const session = await getServerSession();
  return session?.session?.activeOrganizationId ?? null;
}
