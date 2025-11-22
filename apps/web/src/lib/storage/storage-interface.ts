/**
 * Storage Interface for Job Description Extractions, CV Extractions and Job Postings
 *
 * Provides abstraction for storing and retrieving extracted job data, CV data and created jobs.
 * Can be implemented with files, database, or cloud storage.
 */

import type { ExtractedJobData, Job, ExtractedCVData } from "@/lib/mock-data";

export interface StorageInterface {
  /**
   * Get job extraction data by hash ID
   */
  getExtraction(hash: string): Promise<ExtractedJobData | null>;

  /**
   * Save job extraction data with hash key
   */
  saveExtraction(hash: string, data: ExtractedJobData): Promise<void>;

  /**
   * Save uploaded job description file and return path/URL
   */
  saveUpload(hash: string, buffer: Buffer): Promise<string>;

  /**
   * Get path to uploaded job description file
   */
  getUploadPath(hash: string): string;

  /**
   * Check if job extraction exists
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

  /**
   * Get CV extraction data by hash ID
   */
  getCVExtraction(hash: string): Promise<ExtractedCVData | null>;

  /**
   * Save CV extraction data with hash key
   */
  saveCVExtraction(hash: string, data: ExtractedCVData): Promise<void>;

  /**
   * Save uploaded CV file and return path/URL
   */
  saveCVUpload(hash: string, buffer: Buffer): Promise<string>;

  /**
   * Get path to uploaded CV file
   */
  getCVUploadPath(hash: string): string;

  /**
   * Check if CV extraction exists
   */
  hasCVExtraction(hash: string): Promise<boolean>;
}
