/**
 * GCP Cloud Storage Provider Implementation
 *
 * Uploads and manages files in GCP Cloud Storage buckets.
 */

import type { Storage } from "@google-cloud/storage";
import { gcsClient } from "../gcs-client";
import type { CloudStorageProvider } from "./cloud-storage-provider";

export class GCSStorageProvider implements CloudStorageProvider {
  private client: Storage;

  constructor() {
    this.client = gcsClient;
  }

  async uploadFile(
    bucketName: string,
    path: string,
    buffer: Buffer,
    contentType: string
  ): Promise<string> {
    const bucket = this.client.bucket(bucketName);
    const file = bucket.file(path);

    await file.save(buffer, {
      metadata: { contentType },
      resumable: false, // For files under 10MB, non-resumable is faster
    });

    // Return the public URL format for GCS
    return `https://storage.googleapis.com/${bucketName}/${path}`;
  }

  async deleteFile(bucketName: string, path: string): Promise<void> {
    const bucket = this.client.bucket(bucketName);
    const file = bucket.file(path);

    try {
      await file.delete();
    } catch (error) {
      // Ignore 404 errors - file may already be deleted
      if (
        error instanceof Error &&
        "code" in error &&
        (error as { code: number }).code === 404
      ) {
        return;
      }
      throw error;
    }
  }

  async fileExists(bucketName: string, path: string): Promise<boolean> {
    const bucket = this.client.bucket(bucketName);
    const file = bucket.file(path);

    const [exists] = await file.exists();
    return exists;
  }
}
