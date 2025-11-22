/**
 * Custom hooks for job interview questions functionality
 * Handles saving and generating questions with react-query
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

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
