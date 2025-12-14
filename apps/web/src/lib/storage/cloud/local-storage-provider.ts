/**
 * Local Storage Provider Implementation
 *
 * Stores files in the local filesystem for development.
 * Mimics cloud storage behavior with local file paths.
 */

import { promises as fs } from "fs";
import { dirname, join } from "path";
import type { CloudStorageProvider } from "./cloud-storage-provider";

export class LocalStorageProvider implements CloudStorageProvider {
  private baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir ?? join(process.cwd(), "data");
  }

  async uploadFile(
    bucket: string,
    path: string,
    buffer: Buffer,
    _contentType: string
  ): Promise<string> {
    const fullPath = join(this.baseDir, bucket, path);

    // Ensure directory exists
    await fs.mkdir(dirname(fullPath), { recursive: true });

    // Write file
    await fs.writeFile(fullPath, buffer);

    // Return a local path URL format
    return `/local-storage/${bucket}/${path}`;
  }

  async deleteFile(bucket: string, path: string): Promise<void> {
    const fullPath = join(this.baseDir, bucket, path);

    try {
      await fs.unlink(fullPath);
    } catch (error) {
      // Ignore ENOENT errors - file may already be deleted
      if (error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT") {
        return;
      }
      throw error;
    }
  }

  async fileExists(bucket: string, path: string): Promise<boolean> {
    const fullPath = join(this.baseDir, bucket, path);

    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }
}
