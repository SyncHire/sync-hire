/**
 * Hook for fetching organization AI usage quota
 */

import { useQuery } from "@tanstack/react-query";
import { useActiveOrganization } from "@/lib/auth-client";

interface QuotaUsage {
  currentUsage: number;
  limit: number | null;
  tier: "FREE" | "STARTER" | "PROFESSIONAL" | "ENTERPRISE";
  periodKey: string;
  remaining: number | null;
  percentUsed: number | null;
  breakdown: Record<string, number>;
}

interface QuotaResponse {
  success: boolean;
  data: QuotaUsage;
}

export function useOrgQuota() {
  const { data: activeOrg } = useActiveOrganization();
  const orgId = activeOrg?.id;

  return useQuery<QuotaUsage>({
    queryKey: ["org", "quota", orgId],
    queryFn: async () => {
      const response = await fetch(`/api/org/${orgId}/quota`);
      if (!response.ok) {
        throw new Error("Failed to fetch quota");
      }
      const json: QuotaResponse = await response.json();
      return json.data;
    },
    enabled: !!orgId,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refresh every minute
  });
}
