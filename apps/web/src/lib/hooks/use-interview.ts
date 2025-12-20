"use client";

/**
 * Legacy interview hook - only keeps useAnalyzeInterview for backward compatibility
 *
 * @deprecated Use hooks from use-candidate-interview.ts or use-org-interviews.ts instead
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

/**
 * Hook to trigger AI analysis for an interview
 *
 * @deprecated This uses the old endpoint. Consider using useOrgAnalyzeInterview from use-org-interviews.ts
 * Kept for backward compatibility with ResultsContent component
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
    onSuccess: (_data, interviewId) => {
      // Invalidate interview details query to refresh UI
      queryClient.invalidateQueries({
        queryKey: ["/api/interviews", interviewId],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/candidate/interviews", interviewId],
      });
      toast.success("Interview analysis complete!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to analyze interview");
    },
  });
}
