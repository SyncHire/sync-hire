/**
 * Server-only utility for fetching jobs from file storage and mock data
 */

import "server-only";
import { getStorage } from "@/lib/storage/storage-factory";
import { getAllJobs, getJobById } from "@/lib/mock-data";
import type { Job } from "@/lib/mock-data";

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
 */
export async function getAllJobsData(): Promise<Job[]> {
  try {
    const storage = getStorage();
    const storedJobs = await storage.getAllStoredJobs();
    const memoryJobsArray = getAllJobs();

    // Create a map of job IDs for deduplication
    const jobMap = new Map<string, Job>();

    // Add all memory jobs first
    memoryJobsArray.forEach(job => jobMap.set(job.id, job));

    // Override with stored jobs (they're newer)
    storedJobs.forEach(job => jobMap.set(job.id, job));

    return Array.from(jobMap.values());
  } catch {
    // Fall back to memory storage if file access fails
    return getAllJobs();
  }
}
