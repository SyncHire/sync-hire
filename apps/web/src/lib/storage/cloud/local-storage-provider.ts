/**
 * Local Storage Provider Implementation
 *
 * Stores files in the local filesystem for development.
 * Mimics cloud storage behavior with local file paths.
 * Directory structure is handled internally.
 */

import { promises as fs } from "fs";
import { dirname, join } from "path";
import type { CloudStorageProvider } from "./cloud-storage-provider";

const CV_DIR = "cv-uploads";
const JD_DIR = "jd-uploads";

export class LocalStorageProvider implements CloudStorageProvider {
  private baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir ?? join(process.cwd(), "data");
  }

  async uploadCV(hash: string, buffer: Buffer): Promise<string> {
    return this.uploadFile(CV_DIR, hash, buffer);
  }

  async uploadJobDescription(hash: string, buffer: Buffer): Promise<string> {
    return this.uploadFile(JD_DIR, hash, buffer);
  }

  async deleteCV(hash: string): Promise<void> {
    return this.deleteFile(CV_DIR, hash);
  }

  async deleteJobDescription(hash: string): Promise<void> {
    return this.deleteFile(JD_DIR, hash);
  }

  async cvExists(hash: string): Promise<boolean> {
    return this.fileExists(CV_DIR, hash);
  }

  async jobDescriptionExists(hash: string): Promise<boolean> {
    return this.fileExists(JD_DIR, hash);
  }

  private async uploadFile(
    dir: string,
    filename: string,
    buffer: Buffer
  ): Promise<string> {
    const fullPath = join(this.baseDir, dir, filename);

    // Ensure directory exists
    await fs.mkdir(dirname(fullPath), { recursive: true });

    // Write file
    await fs.writeFile(fullPath, buffer);

    // Return a local path URL format
    return `/local-storage/${dir}/${filename}`;
  }

  private async deleteFile(dir: string, filename: string): Promise<void> {
    const fullPath = join(this.baseDir, dir, filename);

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

  private async fileExists(dir: string, filename: string): Promise<boolean> {
    const fullPath = join(this.baseDir, dir, filename);

    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }
}
