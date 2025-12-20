/**
 * Cloud Storage Provider Interface
 *
 * Abstracts file blob operations for different storage backends.
 * Implementations include GCS for production and local filesystem for development.
 *
 * Files are stored privately. Use getSignedUrl() to generate time-limited access URLs.
 * Domain-specific methods handle bucket/path configuration internally.
 */

export interface CloudStorageProvider {
  /**
   * Upload a CV PDF and return the storage path
   *
   * @param hash - The file hash (used as identifier)
   * @param buffer - The file content as a Buffer
   * @returns The relative storage path (e.g., "cv/abc123")
   */
  uploadCV(hash: string, buffer: Buffer): Promise<string>;

  /**
   * Upload a Job Description PDF and return the storage path
   *
   * @param hash - The file hash (used as identifier)
   * @param buffer - The file content as a Buffer
   * @returns The relative storage path (e.g., "jd/abc123")
   */
  uploadJobDescription(hash: string, buffer: Buffer): Promise<string>;

  /**
   * Generate a signed URL for private file access
   *
   * @param type - The file type ('cv' or 'jd')
   * @param path - The relative storage path
   * @param expiresInMinutes - URL expiration time (default: 60)
   * @returns A time-limited signed URL for file access
   */
  getSignedUrl(
    type: "cv" | "jd",
    path: string,
    expiresInMinutes?: number,
  ): Promise<string>;

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
