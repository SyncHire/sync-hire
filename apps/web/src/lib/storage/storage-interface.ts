/**
 * Storage Interface for Job Description Extractions and Job Postings
 *
 * Provides abstraction for storing and retrieving extracted job data and created jobs.
 * Can be implemented with files, database, or cloud storage.
 */

import type { ExtractedJobData, Job } from "@/lib/mock-data";

export interface StorageInterface {
  /**
   * Get extraction data by hash ID
   */
  getExtraction(hash: string): Promise<ExtractedJobData | null>;

  /**
   * Save extraction data with hash key
   */
  saveExtraction(hash: string, data: ExtractedJobData): Promise<void>;

  /**
   * Save uploaded file and return path/URL
   */
  saveUpload(hash: string, buffer: Buffer): Promise<string>;

  /**
   * Get path to uploaded file
   */
  getUploadPath(hash: string): string;

  /**
   * Check if extraction exists
   */
  hasExtraction(hash: string): Promise<boolean>;

  /**
   * Save job posting data
   */
  saveJob(id: string, job: Job): Promise<void>;

  /**
   * Get job posting by ID
   */
  getJob(id: string): Promise<Job | null>;

  /**
   * Get all stored job postings
   */
  getAllStoredJobs(): Promise<Job[]>;

  /**
   * Check if job exists
   */
  hasJob(id: string): Promise<boolean>;
}
