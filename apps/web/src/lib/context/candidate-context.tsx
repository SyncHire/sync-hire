"use client";

/**
 * Candidate Context Provider
 * Provides current candidate user data throughout the candidate views
 */

import type { ExtractedCVData } from "@sync-hire/database";
import { useQuery } from "@tanstack/react-query";
import { createContext, type ReactNode, useContext } from "react";
import type { User } from "@/lib/storage/storage-interface";
import type { JobApplication } from "@/lib/types/interview-types";

interface CVData {
  id: string;
  extractedData: ExtractedCVData;
}

interface CandidateContextValue {
  user: User | null;
  applications: JobApplication[];
  cv: CVData | null;
  isLoading: boolean;
  error: Error | null;
}

const CandidateContext = createContext<CandidateContextValue | null>(null);

interface CandidateJobsResponse {
  success: boolean;
  data: {
    user: User;
    applications: JobApplication[];
  };
}

interface CandidateCVResponse {
  success: boolean;
  data: CVData | null;
}

export function CandidateProvider({ children }: { children: ReactNode }) {
  const jobsQuery = useQuery<CandidateJobsResponse>({
    queryKey: ["/api/candidate/jobs"],
    queryFn: async () => {
      const res = await fetch("/api/candidate/jobs");
      if (!res.ok) {
        throw new Error("Failed to fetch candidate jobs");
      }
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const cvQuery = useQuery<CandidateCVResponse>({
    queryKey: ["/api/candidate/cv"],
    queryFn: async () => {
      const res = await fetch("/api/candidate/cv");
      if (!res.ok) {
        throw new Error("Failed to fetch candidate CV");
      }
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const value: CandidateContextValue = {
    user: jobsQuery.data?.data?.user ?? null,
    applications: jobsQuery.data?.data?.applications ?? [],
    cv: cvQuery.data?.data ?? null,
    isLoading: jobsQuery.isLoading || cvQuery.isLoading,
    error: (jobsQuery.error || cvQuery.error) as Error | null,
  };

  return (
    <CandidateContext.Provider value={value}>
      {children}
    </CandidateContext.Provider>
  );
}

export function useCandidateContext() {
  const context = useContext(CandidateContext);
  if (!context) {
    throw new Error(
      "useCandidateContext must be used within a CandidateProvider",
    );
  }
  return context;
}
