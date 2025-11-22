/**
 * Custom hook for fetching job applicants
 * Uses react-query for data fetching with automatic caching
 */

import { useQuery } from "@tanstack/react-query";

interface Applicant {
  id: string;
  interviewId: string;
  candidateId: string;
  name: string;
  email: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  score?: number;
  durationMinutes: number;
  createdAt: string;
  skills: string[];
}

interface JobInfo {
  id: string;
  title: string;
  company: string;
}

interface Stats {
  total: number;
  completed: number;
  pending: number;
  inProgress: number;
  averageScore: number | null;
}

interface JobApplicantsResponse {
  success: boolean;
  data: {
    job: JobInfo;
    applicants: Applicant[];
    stats: Stats;
  };
}

/**
 * Hook for fetching applicants for a specific job
 */
export function useJobApplicants(jobId: string | null) {
  return useQuery<JobApplicantsResponse>({
    queryKey: ["/api/jobs/applicants", jobId],
    queryFn: async () => {
      if (!jobId) {
        throw new Error("Job ID is required");
      }
      const response = await fetch(`/api/jobs/${jobId}/applicants`);
      if (!response.ok) {
        throw new Error("Failed to fetch applicants");
      }
      return response.json();
    },
    enabled: !!jobId,
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds
  });
}

export type { Applicant, JobInfo, Stats, JobApplicantsResponse };
