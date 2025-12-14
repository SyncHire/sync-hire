/**
 * GCP Cloud Storage Provider Implementation
 *
 * Uploads and manages files in GCP Cloud Storage buckets.
 * Bucket configuration is handled internally.
 */

import type { Storage } from "@google-cloud/storage";
import { gcsClient } from "../gcs-client";
import type { CloudStorageProvider } from "./cloud-storage-provider";

const CV_BUCKET = process.env.GCS_BUCKET_CV ?? "synchire-cvs";
const JD_BUCKET = process.env.GCS_BUCKET_JD ?? "synchire-job-descriptions";

export class GCSStorageProvider implements CloudStorageProvider {
  private client: Storage;

  constructor() {
    this.client = gcsClient;
  }

  async uploadCV(hash: string, buffer: Buffer): Promise<string> {
    return this.uploadFile(CV_BUCKET, `cv/${hash}`, buffer, "application/pdf");
  }

  async uploadJobDescription(hash: string, buffer: Buffer): Promise<string> {
    return this.uploadFile(JD_BUCKET, `jd/${hash}`, buffer, "application/pdf");
  }

  async deleteCV(hash: string): Promise<void> {
    return this.deleteFile(CV_BUCKET, `cv/${hash}`);
  }

  async deleteJobDescription(hash: string): Promise<void> {
    return this.deleteFile(JD_BUCKET, `jd/${hash}`);
  }

  async cvExists(hash: string): Promise<boolean> {
    return this.fileExists(CV_BUCKET, `cv/${hash}`);
  }

  async jobDescriptionExists(hash: string): Promise<boolean> {
    return this.fileExists(JD_BUCKET, `jd/${hash}`);
  }

  private async uploadFile(
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

  private async deleteFile(bucketName: string, path: string): Promise<void> {
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

  private async fileExists(bucketName: string, path: string): Promise<boolean> {
    const bucket = this.client.bucket(bucketName);
    const file = bucket.file(path);

    const [exists] = await file.exists();
    return exists;
  }
}
