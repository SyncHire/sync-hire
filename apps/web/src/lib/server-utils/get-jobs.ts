/**
 * Server-only utility for fetching jobs from storage
 * Applicant counts are computed from actual interviews/applications
 */

import "server-only";
import type { Job } from "@/lib/storage/storage-interface";
import { getStorage } from "@/lib/storage/storage-factory";

// Extended Job type with computed applicantsCount
export interface JobWithApplicantCount extends Job {
  applicantsCount: number;
}

/**
 * Get a single job by ID from storage
 */
export async function getJobData(id: string): Promise<Job | null> {
  const storage = getStorage();
  return storage.getJob(id);
}

/**
 * Get jobs for an organization with computed applicant counts (HR view)
 * @param organizationId - Filter jobs by organization ID (required)
 */
export async function getAllJobsData(organizationId: string): Promise<JobWithApplicantCount[]> {
  const storage = getStorage();
  const storedJobs = await storage.getAllStoredJobs();

  // Filter by organization
  const orgJobs = storedJobs.filter((job) => job.organizationId === organizationId);

  // Sort by createdAt, newest first
  const sortedJobs = orgJobs.sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return dateB - dateA;
  });

  // Compute applicant counts from interviews
  const allInterviews = await storage.getAllInterviews();
  const jobsWithCounts = sortedJobs.map((job) => {
    const jobInterviews = allInterviews.filter((i) => i.jobId === job.id);
    return {
      ...job,
      applicantsCount: jobInterviews.length,
    };
  });

  return jobsWithCounts;
}

/**
 * Get all active jobs across all organizations (Candidate view)
 * Used by candidates to browse available jobs
 */
export async function getAllActiveJobsData(): Promise<JobWithApplicantCount[]> {
  const storage = getStorage();
  const storedJobs = await storage.getAllStoredJobs();

  // Filter to only active jobs
  const activeJobs = storedJobs.filter((job) => job.status === "ACTIVE");

  // Sort by createdAt, newest first
  const sortedJobs = activeJobs.sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return dateB - dateA;
  });

  // Compute applicant counts from interviews
  const allInterviews = await storage.getAllInterviews();
  const jobsWithCounts = sortedJobs.map((job) => {
    const jobInterviews = allInterviews.filter((i) => i.jobId === job.id);
    return {
      ...job,
      applicantsCount: jobInterviews.length,
    };
  });

  return jobsWithCounts;
}
