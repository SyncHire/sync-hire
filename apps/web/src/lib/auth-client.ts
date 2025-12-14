/**
 * Better Auth Client
 *
 * Client-side auth utilities for React components.
 * Provides hooks and functions for authentication and organization management.
 */

import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3000",
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
