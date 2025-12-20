/**
 * Custom hooks for candidate job functionality
 * Centralizes question sets and job application logic with react-query
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/hooks/use-toast";
import { handleResponseError } from "@/lib/queryClient";

interface QuestionSetItem {
  jobId: string;
  hasQuestions: boolean;
}

interface QuestionSetsResponse {
  success: boolean;
  data: QuestionSetItem[];
}

/**
 * Hook for fetching question sets for a CV
 */
export function useQuestionSets(cvId: string | null, enabled: boolean = true) {
  return useQuery<QuestionSetsResponse>({
    queryKey: ["/api/jobs/questions", cvId],
    queryFn: async () => {
      if (!cvId) {
        return { success: true, data: [] };
      }
      const response = await fetch("/api/jobs/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvId }),
      });
      if (!response.ok) {
        throw new Error("Failed to fetch question sets");
      }
      return response.json();
    },
    enabled: !!cvId && enabled,
    staleTime: 30 * 1000,
  });
}

interface ApplyToJobParams {
  cvId: string;
  jobId: string;
}

interface ApplyToJobData {
  applicationId: string;
  cvId: string;
  jobId: string;
  questionCount: number;
  customQuestionCount: number;
  suggestedQuestionCount: number;
  cached: boolean;
}

interface ApplyToJobResponse {
  success: boolean;
  data?: ApplyToJobData;
  message?: string;
}

/**
 * Hook for applying to a job (generates interview questions)
 */
export function useApplyToJob() {
  const queryClient = useQueryClient();

  return useMutation<ApplyToJobResponse, Error, ApplyToJobParams>({
    mutationFn: async ({ cvId, jobId }) => {
      const response = await fetch("/api/jobs/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvId, jobId }),
      });

      if (!response.ok) {
        await handleResponseError(response);
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      // Invalidate question sets to refetch with new application
      queryClient.invalidateQueries({
        queryKey: ["/api/jobs/questions", variables.cvId],
      });

      toast({
        title: "Success",
        description: "Application submitted! Ready to start interview.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description:
          error.message || "Failed to generate questions. Please try again.",
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook for invalidating CV-related queries
 */
export function useInvalidateCVQueries() {
  const queryClient = useQueryClient();

  return {
    invalidateQuestionSets: (cvId: string) => {
      queryClient.invalidateQueries({
        queryKey: ["/api/jobs/questions", cvId],
      });
    },
    invalidateUserCV: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/candidate/cv"],
      });
    },
  };
}
