/**
 * Custom hooks for organization functionality
 *
 * Uses Better Auth's organization plugin for data fetching.
 * Provides React Query integration for caching and invalidation.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { organization, useActiveOrganization } from "@/lib/auth-client";
import { toast } from "@/lib/hooks/use-toast";

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
}

/**
 * Hook for fetching user's organizations
 */
export function useUserOrganizations(enabled: boolean = true) {
  return useQuery<Organization[]>({
    queryKey: ["organizations", "list"],
    queryFn: async () => {
      const result = await organization.list();
      if (result.error) {
        throw new Error(
          result.error.message || "Failed to fetch organizations",
        );
      }
      return (result.data || []) as Organization[];
    },
    enabled,
    staleTime: 60 * 1000, // 1 minute
  });
}

interface SetActiveOrgParams {
  organizationId: string;
}

/**
 * Hook for setting the active organization
 */
export function useSetActiveOrganization() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, SetActiveOrgParams>({
    mutationFn: async ({ organizationId }) => {
      const result = await organization.setActive({ organizationId });
      if (result.error) {
        throw new Error(
          result.error.message || "Failed to set active organization",
        );
      }
    },
    onSuccess: () => {
      // Invalidate session-related queries
      queryClient.invalidateQueries({ queryKey: ["session"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to switch organization",
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook to check if user has any organizations
 */
export function useHasOrganization() {
  const { data: orgs, isLoading } = useUserOrganizations();
  return {
    hasOrganization: orgs && orgs.length > 0,
    isLoading,
    organizationCount: orgs?.length || 0,
  };
}

// Re-export useActiveOrganization from auth-client
export { useActiveOrganization };
