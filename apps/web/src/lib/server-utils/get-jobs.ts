/**
 * Server-only utility for fetching jobs from file storage and mock data
 */

import "server-only";
import type { Job } from "@/lib/mock-data";
import { getAllJobs, getJobById } from "@/lib/mock-data";
import { getStorage } from "@/lib/storage/storage-factory";

/**
 * Get a single job by ID, checking file storage first then memory
 */
export async function getJobData(id: string): Promise<Job | undefined> {
  try {
    const storage = getStorage();
    const storedJob = await storage.getJob(id);
    if (storedJob) return storedJob;
  } catch {
    // Fall through to memory storage
  }

  // Fall back to memory storage
  return getJobById(id);
}

/**
 * Get all jobs, merging file storage with memory
 * Also computes accurate applicantsCount from actual applications
 */
export async function getAllJobsData(): Promise<Job[]> {
  try {
    const storage = getStorage();
    const storedJobs = await storage.getAllStoredJobs();
    const memoryJobsArray = getAllJobs();

    // Create a map of job IDs for deduplication
    const jobMap = new Map<string, Job>();

    // Add all memory jobs first
    memoryJobsArray.forEach((job) => jobMap.set(job.id, job));

    // Override with stored jobs (they're newer)
    storedJobs.forEach((job) => jobMap.set(job.id, job));

    // Sort by createdAt, newest first (real jobs will appear before mock jobs)
    const jobs = Array.from(jobMap.values());
    const sortedJobs = jobs.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA; // Descending order (newest first)
    });

    // Compute accurate applicant counts from interviews (interviews are the source of truth)
    const allInterviews = await storage.getAllInterviews();
    const jobsWithCounts = sortedJobs.map((job) => {
      const jobInterviews = allInterviews.filter((i) => i.jobId === job.id);
      return {
        ...job,
        applicantsCount: jobInterviews.length,
      };
    });

    return jobsWithCounts;
  } catch (error) {
    console.error(
      new Error("Failed to fetch jobs from file storage", { cause: error }),
    );
    // Fall back to memory storage if file access fails
    const jobs = getAllJobs();
    return jobs.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });
  }
}
