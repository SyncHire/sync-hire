"use client";

/**
 * React Query hooks for candidate interview operations
 * All operations are scoped to the authenticated candidate
 */

import { useMutation, useQuery } from "@tanstack/react-query";
import type { CandidateInterviewResponse } from "@/lib/types/api-responses";

// =============================================================================
// Interview Details
// =============================================================================

interface UseCandidateInterviewOptions {
  refetchInterval?: number | false;
}

/**
 * Hook for fetching candidate's own interview details
 */
export function useCandidateInterview(
  interviewId: string | null,
  options?: UseCandidateInterviewOptions
) {
  return useQuery<{ success: boolean; data: CandidateInterviewResponse }>({
    queryKey: ["/api/candidate/interviews", interviewId],
    queryFn: async () => {
      if (!interviewId) {
        throw new Error("Interview ID is required");
      }
      const response = await fetch(`/api/candidate/interviews/${interviewId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch interview");
      }
      return response.json();
    },
    enabled: !!interviewId,
    staleTime: 5 * 1000,
    refetchInterval: options?.refetchInterval ?? 3000,
  });
}

// =============================================================================
// Start Interview
// =============================================================================

interface StartInterviewParams {
  interviewId: string;
  candidateName?: string;
}

interface StartInterviewResponse {
  success: boolean;
  callId: string;
  interviewId: string;
  videoAvatarEnabled?: boolean;
  message: string;
}

/**
 * Hook to start an interview
 * Invites the AI agent to the call
 */
export function useStartCandidateInterview() {
  return useMutation<StartInterviewResponse, Error, StartInterviewParams>({
    mutationFn: async ({ interviewId, candidateName }) => {
      const response = await fetch(`/api/candidate/interviews/${interviewId}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateName }),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Failed to start interview" }));
        throw new Error(errorData.error || "Failed to start interview");
      }

      return response.json();
    },
    retry: 1,
  });
}

// =============================================================================
// Stream Token (shared - used by both candidates and HR)
// =============================================================================

interface StreamTokenResponse {
  token: string;
}

/**
 * Hook to get Stream video token for a user
 * Uses React Query to cache and deduplicate requests
 */
export function useStreamToken(userId: string) {
  return useQuery({
    queryKey: ["stream-token", userId],
    queryFn: async (): Promise<StreamTokenResponse> => {
      const response = await fetch("/api/stream-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch Stream token");
      }

      return response.json();
    },
    staleTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

export type {
  CandidateInterviewResponse,
  StartInterviewParams,
  StartInterviewResponse,
  StreamTokenResponse,
};
