"use client";

/**
 * React Query hooks for interview API calls
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface StartInterviewParams {
  interviewId: string;
  candidateId: string;
  candidateName?: string;
}

interface StartInterviewResponse {
  success: boolean;
  callId: string;
  interviewId: string;
  videoAvatarEnabled?: boolean;
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

import type { Interview } from "@/lib/storage/storage-interface";

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

/**
 * Hook to trigger AI analysis for an interview
 */
export function useAnalyzeInterview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (interviewId: string) => {
      const response = await fetch(`/api/interviews/${interviewId}/analyze`, {
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
    onSuccess: (data, interviewId) => {
      // Invalidate interview details query to refresh UI
      queryClient.invalidateQueries({
        queryKey: ["/api/interviews", interviewId],
      });
      toast.success("Interview analysis complete!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to analyze interview");
    },
  });
}

export type { InterviewDetailsResponse };
