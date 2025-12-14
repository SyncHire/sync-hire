/**
 * Custom hook for current user data
 *
 * Uses Better Auth's useSession hook for authentication.
 * Provides a backwards-compatible interface with the old API-based approach.
 */

import { useSession } from "@/lib/auth-client";

interface User {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}

interface UserResponse {
  success: boolean;
  data: User | null;
}

/**
 * Hook for fetching current user using Better Auth session
 */
export function useCurrentUser() {
  const session = useSession();

  // Transform session data to match the old response format
  const data: UserResponse | undefined = session.data
    ? {
        success: true,
        data: {
          id: session.data.user.id,
          name: session.data.user.name,
          email: session.data.user.email,
          image: session.data.user.image,
        },
      }
    : session.isPending
      ? undefined
      : { success: false, data: null };

  return {
    data,
    isLoading: session.isPending,
    isError: !session.isPending && !session.data,
    error: session.error,
  };
}
