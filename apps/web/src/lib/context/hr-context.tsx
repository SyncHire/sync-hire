"use client";

/**
 * HR Context Provider
 * Provides current HR/employer user data throughout the HR views
 */

import { useQuery } from "@tanstack/react-query";
import { createContext, type ReactNode, useContext } from "react";
import type { Job, User } from "@/lib/storage/storage-interface";

interface HRContextValue {
  user: User | null;
  jobs: Job[];
  isLoading: boolean;
  error: Error | null;
}

const HRContext = createContext<HRContextValue | null>(null);

interface UserResponse {
  success: boolean;
  data: User;
}

interface JobsResponse {
  success: boolean;
  data: Job[];
}

export function HRProvider({ children }: { children: ReactNode }) {
  const userQuery = useQuery<UserResponse>({
    queryKey: ["/api/users/me"],
    queryFn: async () => {
      const res = await fetch("/api/users/me");
      if (!res.ok) {
        throw new Error("Failed to fetch user");
      }
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const jobsQuery = useQuery<JobsResponse>({
    queryKey: ["/api/jobs"],
    queryFn: async () => {
      const res = await fetch("/api/jobs");
      if (!res.ok) {
        throw new Error("Failed to fetch jobs");
      }
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const value: HRContextValue = {
    user: userQuery.data?.data ?? null,
    jobs: jobsQuery.data?.data ?? [],
    isLoading: userQuery.isLoading || jobsQuery.isLoading,
    error: (userQuery.error || jobsQuery.error) as Error | null,
  };

  return <HRContext.Provider value={value}>{children}</HRContext.Provider>;
}

export function useHRContext() {
  const context = useContext(HRContext);
  if (!context) {
    throw new Error("useHRContext must be used within an HRProvider");
  }
  return context;
}
