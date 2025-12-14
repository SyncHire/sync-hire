/**
 * Cloud Storage Provider Interface
 *
 * Abstracts file blob operations for different storage backends.
 * Implementations include GCS for production and local filesystem for development.
 *
 * Domain-specific methods handle bucket/path configuration internally.
 */

export interface CloudStorageProvider {
  /**
   * Upload a CV PDF and return the URL
   *
   * @param hash - The file hash (used as identifier)
   * @param buffer - The file content as a Buffer
   * @returns The URL where the file can be accessed
   */
  uploadCV(hash: string, buffer: Buffer): Promise<string>;

  /**
   * Upload a Job Description PDF and return the URL
   *
   * @param hash - The file hash (used as identifier)
   * @param buffer - The file content as a Buffer
   * @returns The URL where the file can be accessed
   */
  uploadJobDescription(hash: string, buffer: Buffer): Promise<string>;

  /**
   * Delete a CV file from storage
   *
   * @param hash - The file hash
   */
  deleteCV(hash: string): Promise<void>;

  /**
   * Delete a Job Description file from storage
   *
   * @param hash - The file hash
   */
  deleteJobDescription(hash: string): Promise<void>;

  /**
   * Check if a CV file exists in storage
   *
   * @param hash - The file hash
   * @returns True if the file exists
   */
  cvExists(hash: string): Promise<boolean>;

  /**
   * Check if a Job Description file exists in storage
   *
   * @param hash - The file hash
   * @returns True if the file exists
   */
  jobDescriptionExists(hash: string): Promise<boolean>;
}
