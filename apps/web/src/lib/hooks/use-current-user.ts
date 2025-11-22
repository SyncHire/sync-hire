/**
 * Custom hook for current user data
 * Uses react-query for data fetching with automatic caching
 */

import { useQuery } from "@tanstack/react-query";
import type { User } from "@/lib/mock-data";

interface UserResponse {
  success: boolean;
  data: User;
}

/**
 * Hook for fetching current user
 */
export function useCurrentUser() {
  return useQuery<UserResponse>({
    queryKey: ["/api/users/me"],
    queryFn: async () => {
      const response = await fetch("/api/users/me");
      if (!response.ok) {
        throw new Error("Failed to fetch user");
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
  });
}
