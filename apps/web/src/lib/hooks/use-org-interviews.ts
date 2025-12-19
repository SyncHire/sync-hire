"use client";

/**
 * React Query hooks for HR interview operations (org-scoped)
 * All operations require organization membership
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { HRInterviewResponse, AIEvaluation } from "@/lib/types/api-responses";

// =============================================================================
// Interview List and Details
// =============================================================================

interface UseOrgInterviewsOptions {
  refetchInterval?: number | false;
}

/**
 * Hook for fetching all interviews for an organization
 */
export function useOrgInterviews(orgId: string | null, options?: UseOrgInterviewsOptions) {
  return useQuery<{ success: boolean; data: HRInterviewResponse[] }>({
    queryKey: ["/api/orgs", orgId, "interviews"],
    queryFn: async () => {
      const response = await fetch(`/api/orgs/${orgId}/interviews`);
      if (!response.ok) {
        throw new Error("Failed to fetch interviews");
      }
      return response.json();
    },
    enabled: !!orgId,
    staleTime: 30 * 1000,
    refetchInterval: options?.refetchInterval,
  });
}

interface UseOrgInterviewOptions {
  refetchInterval?: number | false;
}

/**
 * Hook for fetching a single interview with full HR details
 */
export function useOrgInterview(
  orgId: string | null,
  interviewId: string | null,
  options?: UseOrgInterviewOptions
) {
  return useQuery<{ success: boolean; data: HRInterviewResponse }>({
    queryKey: ["/api/orgs", orgId, "interviews", interviewId],
    queryFn: async () => {
      if (!orgId || !interviewId) {
        throw new Error("Organization ID and Interview ID are required");
      }
      const response = await fetch(`/api/orgs/${orgId}/interviews/${interviewId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch interview");
      }
      return response.json();
    },
    enabled: !!orgId && !!interviewId,
    staleTime: 5 * 1000,
    refetchInterval: options?.refetchInterval ?? 3000,
  });
}

// =============================================================================
// Interview Analysis
// =============================================================================

interface AnalyzeInterviewParams {
  orgId: string;
  interviewId: string;
}

interface AnalyzeInterviewResponse {
  success: boolean;
  message: string;
  interview?: HRInterviewResponse;
  error?: string;
}

/**
 * Hook to trigger AI analysis for an interview
 */
export function useOrgAnalyzeInterview() {
  const queryClient = useQueryClient();

  return useMutation<AnalyzeInterviewResponse, Error, AnalyzeInterviewParams>({
    mutationFn: async ({ orgId, interviewId }) => {
      const response = await fetch(`/api/orgs/${orgId}/interviews/${interviewId}/analyze`, {
        method: "POST",
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Failed to analyze interview" }));
        throw new Error(errorData.error || "Failed to analyze interview");
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      // Invalidate interview queries to refresh UI
      queryClient.invalidateQueries({
        queryKey: ["/api/orgs", variables.orgId, "interviews", variables.interviewId],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/orgs", variables.orgId, "interviews"],
      });
      toast.success("Interview analysis complete!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to analyze interview");
    },
  });
}

export type {
  HRInterviewResponse,
  AIEvaluation,
  AnalyzeInterviewParams,
  AnalyzeInterviewResponse,
};
