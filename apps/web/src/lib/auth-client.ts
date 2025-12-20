/**
 * Better Auth Client
 *
 * Client-side auth utilities for React components.
 * Provides hooks and functions for authentication and organization management.
 */

import { organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

/**
 * Get the base URL for auth API calls.
 * In browser: uses current origin (automatically handles any port)
 * In SSR: uses NEXT_PUBLIC_BETTER_AUTH_URL or falls back to localhost with WEB_PORT
 */
function getBaseURL(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  // Server-side: use env var or construct from WEB_PORT
  const port = process.env.WEB_PORT || "3000";
  return process.env.NEXT_PUBLIC_BETTER_AUTH_URL || `http://localhost:${port}`;
}

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
  plugins: [organizationClient()],
});

// Export commonly used functions and hooks
export const {
  useSession,
  signIn,
  signUp,
  signOut,
  useActiveOrganization,
  organization,
} = authClient;

// Type exports for use throughout app
export type AuthSession = typeof authClient.$Infer.Session;
export type AuthUser = typeof authClient.$Infer.Session.user;
