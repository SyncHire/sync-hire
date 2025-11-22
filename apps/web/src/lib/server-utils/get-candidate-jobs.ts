/**
 * Server-only utility for fetching job applications for candidates
 */

import "server-only";
import type { JobApplication } from "@/lib/mock-data";
import { getAllJobsData } from "./get-jobs";

/**
 * Get all jobs as JobApplications for a candidate
 * Returns jobs with candidate-specific application context
 */
export async function getCandidateJobApplications(
  userId: string,
): Promise<JobApplication[]> {
  const jobs = await getAllJobsData();

  return jobs.map((job) => ({
    id: `application-${job.id}-${userId}`,
    job: job,
    candidateId: userId,
    matchPercentage: generateMatchPercentage(job.id, userId),
    status: "NOT_APPLIED" as const,
    createdAt: new Date(job.createdAt),
  }));
}

/**
 * Generate a consistent match percentage based on job and user IDs
 * This ensures the same job-user pair always gets the same percentage
 */
function generateMatchPercentage(jobId: string, userId: string): number {
  // Simple hash function to generate consistent number
  const combined = `${jobId}-${userId}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Map to 70-100 range
  return 70 + Math.abs(hash % 31);
}
