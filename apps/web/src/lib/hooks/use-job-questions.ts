/**
 * Custom hooks for job interview questions functionality
 * Handles saving and generating questions with react-query
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Job } from "@/lib/mock-data";
import { toast } from "sonner";

// =============================================================================
// Job Query Hooks
// =============================================================================

interface UseJobOptions {
  pollWhileScanning?: boolean;
}

/**
 * Hook for fetching a single job with optional polling while scanning
 */
export function useJob(jobId: string | undefined, options?: UseJobOptions) {
  return useQuery({
    queryKey: [`/api/jobs/${jobId}`],
    queryFn: async () => {
      const response = await fetch(`/api/jobs/${jobId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch job");
      }
      const result = await response.json();
      return result.data as Job | null;
    },
    enabled: !!jobId,
    refetchInterval: (query) => {
      if (options?.pollWhileScanning && query.state.data?.aiMatchingStatus === "scanning") {
        return 2000;
      }
      return false;
    },
  });
}

interface Question {
  id: string;
  text: string;
  type: "text" | "video" | "code";
  duration: number;
}

interface SaveQuestionsParams {
  jobId: string;
  questions: Question[];
}

interface SaveQuestionsResponse {
  success: boolean;
  data?: {
    id: string;
    questionCount: number;
  };
  error?: string;
}

/**
 * Hook for saving job interview questions
 */
export function useSaveJobQuestions() {
  const queryClient = useQueryClient();

  return useMutation<SaveQuestionsResponse, Error, SaveQuestionsParams>({
    mutationFn: async ({ jobId, questions }) => {
      const response = await fetch(`/api/jobs/${jobId}/questions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save questions");
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      // Invalidate jobs query to refresh the list
      queryClient.invalidateQueries({
        queryKey: ["/api/jobs"],
      });

      toast.success("Questions saved successfully!");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save questions");
    },
  });
}

interface GenerateQuestionsParams {
  jobId: string;
  title: string;
  description?: string;
  requirements?: string[];
}

interface GeneratedQuestion {
  content: string;
  reason?: string;
}

interface GenerateQuestionsResponse {
  success: boolean;
  data?: {
    questions: GeneratedQuestion[];
  };
  error?: string;
}

/**
 * Hook for generating AI interview questions
 */
export function useGenerateJobQuestions() {
  return useMutation<GenerateQuestionsResponse, Error, GenerateQuestionsParams>({
    mutationFn: async ({ jobId, title, description, requirements }) => {
      const response = await fetch("/api/jobs/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, title, description, requirements }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate questions");
      }

      return response.json();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to generate questions");
    },
  });
}

// =============================================================================
// Job Settings Mutations
// =============================================================================

interface UpdateJobSettingsParams {
  jobId: string;
  aiMatchingEnabled?: boolean;
  aiMatchingThreshold?: number;
}

interface UpdateJobSettingsResponse {
  success: boolean;
  error?: string;
}

/**
 * Hook for updating job settings (AI matching, etc.)
 */
export function useUpdateJobSettings() {
  const queryClient = useQueryClient();

  return useMutation<UpdateJobSettingsResponse, Error, UpdateJobSettingsParams>({
    mutationFn: async ({ jobId, ...settings }) => {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update job settings");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update settings");
    },
  });
}

interface MatchCandidatesParams {
  jobId: string;
}

interface MatchCandidatesResponse {
  success: boolean;
  data?: {
    matchedCount: number;
    applications: Array<{
      id: string;
      candidateName: string;
      matchScore: number;
      status: string;
    }>;
  };
  error?: string;
}

/**
 * Hook for triggering AI candidate matching
 */
export function useMatchCandidates() {
  const queryClient = useQueryClient();

  return useMutation<MatchCandidatesResponse, Error, MatchCandidatesParams>({
    mutationFn: async ({ jobId }) => {
      const response = await fetch(`/api/jobs/${jobId}/match-candidates`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to match candidates");
      }

      return response.json();
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: [`/api/jobs/${variables.jobId}/applications`] });
      toast.success(`Found ${result.data?.matchedCount || 0} matching candidates!`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to match candidates");
    },
  });
}
