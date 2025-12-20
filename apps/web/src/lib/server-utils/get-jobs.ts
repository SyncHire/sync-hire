/**
 * Server-only utility for fetching jobs from storage
 * Applicant counts are computed from actual interviews/applications
 */

import "server-only";
import { getStorage } from "@/lib/storage/storage-factory";
import type { Interview, Job } from "@/lib/storage/storage-interface";

// Extended Job type with computed applicantsCount
export interface JobWithApplicantCount extends Job {
  applicantsCount: number;
}

/**
 * Sort jobs by creation date, newest first
 */
function sortJobsByCreatedAt(jobs: Job[]): Job[] {
  return [...jobs].sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return dateB - dateA;
  });
}

/**
 * Add applicant counts to jobs based on interviews
 */
function addApplicantCounts(
  jobs: Job[],
  interviews: Interview[],
): JobWithApplicantCount[] {
  return jobs.map((job) => {
    const jobInterviews = interviews.filter(
      (interview) => interview.jobId === job.id,
    );
    return {
      ...job,
      applicantsCount: jobInterviews.length,
    };
  });
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
export async function getAllJobsData(
  organizationId: string,
): Promise<JobWithApplicantCount[]> {
  const storage = getStorage();
  const storedJobs = await storage.getAllStoredJobs();
  const allInterviews = await storage.getAllInterviews();

  const orgJobs = storedJobs.filter(
    (job) => job.organizationId === organizationId,
  );
  const sortedJobs = sortJobsByCreatedAt(orgJobs);

  return addApplicantCounts(sortedJobs, allInterviews);
}

/**
 * Get all active jobs across all organizations (Candidate view)
 * Used by candidates to browse available jobs
 */
export async function getAllActiveJobsData(): Promise<JobWithApplicantCount[]> {
  const storage = getStorage();
  const storedJobs = await storage.getAllStoredJobs();
  const allInterviews = await storage.getAllInterviews();

  const activeJobs = storedJobs.filter((job) => job.status === "ACTIVE");
  const sortedJobs = sortJobsByCreatedAt(activeJobs);

  return addApplicantCounts(sortedJobs, allInterviews);
}
