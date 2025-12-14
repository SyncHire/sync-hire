/**
 * Cloud Storage Provider Interface
 *
 * Abstracts file blob operations for different storage backends.
 * Implementations include GCS for production and local filesystem for development.
 */

export interface CloudStorageProvider {
  /**
   * Upload a file buffer and return the public URL
   *
   * @param bucket - The bucket/directory name
   * @param path - The file path within the bucket
   * @param buffer - The file content as a Buffer
   * @param contentType - The MIME type of the file
   * @returns The URL where the file can be accessed
   */
  uploadFile(
    bucket: string,
    path: string,
    buffer: Buffer,
    contentType: string
  ): Promise<string>;

  /**
   * Delete a file from storage
   *
   * @param bucket - The bucket/directory name
   * @param path - The file path within the bucket
   */
  deleteFile(bucket: string, path: string): Promise<void>;

  /**
   * Check if a file exists in storage
   *
   * @param bucket - The bucket/directory name
   * @param path - The file path within the bucket
   * @returns True if the file exists
   */
  fileExists(bucket: string, path: string): Promise<boolean>;
}
