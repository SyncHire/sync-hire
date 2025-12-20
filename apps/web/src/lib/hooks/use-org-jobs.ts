"use client";

/**
 * React Query hooks for HR job operations (org-scoped)
 * All operations require organization membership
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { handleResponseError } from "@/lib/queryClient";
import type { Job as BaseJob } from "@/lib/storage/storage-interface";

// Extend base Job type with computed fields from API
export type Job = BaseJob & {
  applicantsCount?: number;
};

// =============================================================================
// Job List and Details
// =============================================================================

interface UseOrgJobsOptions {
  pollWhileScanning?: boolean;
}

/**
 * Hook for fetching jobs for an organization with optional polling while any are scanning
 */
export function useOrgJobs(orgId: string | null, options?: UseOrgJobsOptions) {
  return useQuery({
    queryKey: ["/api/orgs", orgId, "jobs"],
    queryFn: async () => {
      const response = await fetch(`/api/orgs/${orgId}/jobs`);
      if (!response.ok) {
        throw new Error("Failed to fetch jobs");
      }
      const result = await response.json();
      return (result.data || []) as Job[];
    },
    enabled: !!orgId,
    refetchInterval: (query) => {
      // Poll while any job is scanning
      if (options?.pollWhileScanning) {
        const jobs = query.state.data;
        if (Array.isArray(jobs) && jobs.some((job: Job) => job.aiMatchingStatus === "SCANNING")) {
          return 2000;
        }
      }
      return false;
    },
  });
}

interface UseOrgJobOptions {
  pollWhileScanning?: boolean;
  forcePolling?: boolean;
}

/**
 * Hook for fetching a single job with optional polling while scanning
 */
export function useOrgJob(orgId: string | null, jobId: string | null, options?: UseOrgJobOptions) {
  return useQuery({
    queryKey: ["/api/orgs", orgId, "jobs", jobId],
    queryFn: async () => {
      const response = await fetch(`/api/orgs/${orgId}/jobs/${jobId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch job");
      }
      const result = await response.json();
      return result.data as Job | null;
    },
    enabled: !!orgId && !!jobId,
    refetchInterval: (query) => {
      if (options?.forcePolling) {
        return 2000;
      }
      if (options?.pollWhileScanning && query.state.data?.aiMatchingStatus === "SCANNING") {
        return 2000;
      }
      return false;
    },
  });
}

// =============================================================================
// Applicants
// =============================================================================

interface Applicant {
  id: string;
  interviewId: string | null;
  candidateId: string;
  cvId: string | null;
  name: string;
  email: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  score?: number;
  durationMinutes: number;
  createdAt: string;
  completedAt?: string | null;
  aiEvaluation?: unknown;
  skills: string[];
  experience: unknown[];
  source: "interview" | "ai_match";
  matchReasons?: string[];
  skillGaps?: string[];
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

interface OrgJobApplicantsResponse {
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
export function useOrgJobApplicants(orgId: string | null, jobId: string | null) {
  return useQuery<OrgJobApplicantsResponse>({
    queryKey: ["/api/orgs", orgId, "jobs", jobId, "applicants"],
    queryFn: async () => {
      if (!orgId || !jobId) {
        throw new Error("Organization ID and Job ID are required");
      }
      const response = await fetch(`/api/orgs/${orgId}/jobs/${jobId}/applicants`);
      if (!response.ok) {
        throw new Error("Failed to fetch applicants");
      }
      return response.json();
    },
    enabled: !!orgId && !!jobId,
    staleTime: 30 * 1000,
  });
}

// =============================================================================
// Questions CRUD
// =============================================================================

interface Question {
  id: string;
  text: string;
  type: "text" | "video" | "code";
  duration: number;
}

interface SaveQuestionsParams {
  orgId: string;
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
export function useSaveOrgJobQuestions() {
  const queryClient = useQueryClient();

  return useMutation<SaveQuestionsResponse, Error, SaveQuestionsParams>({
    mutationFn: async ({ orgId, jobId, questions }) => {
      const response = await fetch(`/api/orgs/${orgId}/jobs/${jobId}/questions`, {
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
      queryClient.invalidateQueries({
        queryKey: ["/api/orgs", variables.orgId, "jobs"],
      });
      toast.success("Questions saved successfully!");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save questions");
    },
  });
}

// =============================================================================
// Question Generation (AI)
// =============================================================================

interface GenerateQuestionsParams {
  orgId: string;
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
export function useGenerateOrgJobQuestions() {
  return useMutation<GenerateQuestionsResponse, Error, GenerateQuestionsParams>({
    mutationFn: async ({ jobId, title, description, requirements }) => {
      // Uses existing endpoint which already handles quota via jobId lookup
      const response = await fetch("/api/jobs/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, title, description, requirements }),
      });

      if (!response.ok) {
        await handleResponseError(response);
      }

      return response.json();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to generate questions");
    },
  });
}

// =============================================================================
// AI Matching
// =============================================================================

interface MatchCandidatesParams {
  orgId: string;
  jobId: string;
}

interface MatchCandidatesResponse {
  success: boolean;
  data?: {
    matchedCount: number;
    threshold: number;
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
export function useOrgMatchCandidates() {
  const queryClient = useQueryClient();

  return useMutation<MatchCandidatesResponse, Error, MatchCandidatesParams>({
    mutationFn: async ({ orgId, jobId }) => {
      const response = await fetch(`/api/orgs/${orgId}/jobs/${jobId}/match-candidates`, {
        method: "POST",
      });

      if (!response.ok) {
        await handleResponseError(response);
      }

      return response.json();
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/orgs", variables.orgId, "jobs"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/orgs", variables.orgId, "jobs", variables.jobId, "applicants"],
      });
      toast.success(`Found ${result.data?.matchedCount || 0} matching candidates!`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to match candidates");
    },
  });
}

// =============================================================================
// Job Creation
// =============================================================================

interface CreateJobParams {
  orgId: string;
  title: string;
  description: string;
  location: string;
  employmentType: string;
  workArrangement?: string;
  requirements: string[];
  responsibilities: string[];
  seniority: string;
  department?: string;
  salary?: string;
  customQuestions?: Array<{
    text: string;
    type: "text" | "video" | "code";
    duration: number;
    order: number;
    source?: "ai" | "custom";
  }>;
  originalJDText?: string;
  aiMatchingEnabled?: boolean;
  aiMatchingThreshold?: number;
}

interface CreateJobResponse {
  success: boolean;
  data?: {
    id: string;
    title: string;
    location: string;
    customQuestionsCount: number;
    status: string;
    aiMatchingStatus: string;
  };
  error?: string;
}

/**
 * Hook for creating a new job
 */
export function useCreateOrgJob() {
  const queryClient = useQueryClient();

  return useMutation<CreateJobResponse, Error, CreateJobParams>({
    mutationFn: async ({ orgId, ...jobData }) => {
      const response = await fetch(`/api/orgs/${orgId}/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(jobData),
      });

      if (!response.ok) {
        await handleResponseError(response);
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/orgs", variables.orgId, "jobs"] });
      toast.success("Job created successfully!");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create job");
    },
  });
}

// =============================================================================
// Job Settings
// =============================================================================

interface UpdateJobSettingsParams {
  orgId: string;
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
export function useUpdateOrgJobSettings() {
  const queryClient = useQueryClient();

  return useMutation<UpdateJobSettingsResponse, Error, UpdateJobSettingsParams>({
    mutationFn: async ({ orgId, jobId, ...settings }) => {
      const response = await fetch(`/api/orgs/${orgId}/jobs/${jobId}`, {
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/orgs", variables.orgId, "jobs"] });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update settings");
    },
  });
}

export type {
  Applicant,
  JobInfo,
  Stats,
  OrgJobApplicantsResponse,
  Question,
  SaveQuestionsParams,
  GenerateQuestionsParams,
  GeneratedQuestion,
  MatchCandidatesParams,
  CreateJobParams,
};
