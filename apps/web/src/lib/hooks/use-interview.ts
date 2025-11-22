"use client";

/**
 * React Query hooks for interview API calls
 */
import { useMutation, useQuery } from "@tanstack/react-query";

interface StartInterviewParams {
  interviewId: string;
  candidateId: string;
  candidateName?: string;
}

interface StartInterviewResponse {
  success: boolean;
  callId: string;
  interviewId: string;
  message: string;
}

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
    // Cache token for 1 hour (Stream tokens are typically valid for longer)
    staleTime: 60 * 60 * 1000,
    // Don't refetch on window focus (but allow initial mount fetch)
    refetchOnWindowFocus: false,
    // Only retry once on failure
    retry: 1,
  });
}

/**
 * Hook to start an interview
 * Invites the AI agent to the call
 */
export function useStartInterview() {
  return useMutation({
    mutationFn: async (
      params: StartInterviewParams,
    ): Promise<StartInterviewResponse> => {
      const response = await fetch("/api/start-interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Failed to start interview" }));
        throw new Error(errorData.error || "Failed to start interview");
      }

      return response.json();
    },
    // Only retry once on failure
    retry: 1,
  });
}

import type { Interview } from "@/lib/mock-data";

interface InterviewDetailsResponse {
  success: boolean;
  data: {
    interview: Interview;
    job: {
      id: string;
      title: string;
      company: string;
    } | null;
    candidate: {
      id: string;
      name: string;
      email: string;
    } | null;
  };
}

interface UseInterviewDetailsOptions {
  /** Enable polling every N milliseconds. Set to false to disable polling. */
  refetchInterval?: number | false;
}

/**
 * Hook for fetching a single interview with full details
 * Supports polling for waiting on AI evaluation
 */
export function useInterviewDetails(
  interviewId: string | null,
  options: UseInterviewDetailsOptions = {},
) {
  const { refetchInterval = 3000 } = options;

  return useQuery<InterviewDetailsResponse>({
    queryKey: ["/api/interviews", interviewId],
    queryFn: async () => {
      if (!interviewId) {
        throw new Error("Interview ID is required");
      }
      const response = await fetch(`/api/interviews/${interviewId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch interview");
      }
      return response.json();
    },
    enabled: !!interviewId,
    staleTime: 5 * 1000, // Consider data fresh for 5 seconds when polling
    refetchInterval: interviewId ? refetchInterval : false,
  });
}

export type { InterviewDetailsResponse };
