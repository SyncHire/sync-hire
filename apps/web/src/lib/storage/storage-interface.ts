/**
 * Storage Interface for Job Description Extractions
 *
 * Provides abstraction for storing and retrieving extracted job data.
 * Can be implemented with files, database, or cloud storage.
 */

import type { ExtractedJobData } from "@/lib/mock-data";

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
}
