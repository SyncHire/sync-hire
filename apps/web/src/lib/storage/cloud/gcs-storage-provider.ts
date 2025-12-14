/**
 * GCP Cloud Storage Provider Implementation
 *
 * Uploads and manages files in GCP Cloud Storage buckets.
 * Files are stored privately; use getSignedUrl() for time-limited access.
 * Uses a single bucket with path prefixes: cv/, jd/
 */

import type { Storage } from "@google-cloud/storage";
import type { CloudStorageProvider } from "./cloud-storage-provider";
import { storageConfig } from "../storage-config";

export class GCSStorageProvider implements CloudStorageProvider {
  constructor(private readonly client: Storage) {}

  async uploadCV(hash: string, buffer: Buffer): Promise<string> {
    const path = `cv/${hash}`;
    await this.uploadFile(path, buffer, "application/pdf");
    return path;
  }

  async uploadJobDescription(hash: string, buffer: Buffer): Promise<string> {
    const path = `jd/${hash}`;
    await this.uploadFile(path, buffer, "application/pdf");
    return path;
  }

  async getSignedUrl(_type: 'cv' | 'jd', path: string, expiresInMinutes = 60): Promise<string> {
    const bucket = this.client.bucket(storageConfig.gcsBucket);
    const file = bucket.file(path);

    const [url] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + expiresInMinutes * 60 * 1000,
    });

    return url;
  }

  async deleteCV(hash: string): Promise<void> {
    return this.deleteFile(`cv/${hash}`);
  }

  async deleteJobDescription(hash: string): Promise<void> {
    return this.deleteFile(`jd/${hash}`);
  }

  async cvExists(hash: string): Promise<boolean> {
    return this.fileExists(`cv/${hash}`);
  }

  async jobDescriptionExists(hash: string): Promise<boolean> {
    return this.fileExists(`jd/${hash}`);
  }

  private async uploadFile(
    path: string,
    buffer: Buffer,
    contentType: string
  ): Promise<void> {
    const bucket = this.client.bucket(storageConfig.gcsBucket);
    const file = bucket.file(path);

    console.log(`[GCS] Uploading: gs://${storageConfig.gcsBucket}/${path} (${buffer.length} bytes)`);

    await file.save(buffer, {
      metadata: { contentType },
      resumable: false, // For files under 10MB, non-resumable is faster
    });

    console.log(`[GCS] Upload complete: gs://${storageConfig.gcsBucket}/${path}`);
  }

  private async deleteFile(path: string): Promise<void> {
    const bucket = this.client.bucket(storageConfig.gcsBucket);
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

  private async fileExists(path: string): Promise<boolean> {
    const bucket = this.client.bucket(storageConfig.gcsBucket);
    const file = bucket.file(path);

    const [exists] = await file.exists();
    return exists;
  }
}
