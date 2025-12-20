/**
 * Local Storage Provider Implementation
 *
 * Stores files in the local filesystem for development.
 * Mimics cloud storage behavior with local file paths.
 * Directory structure is handled internally.
 */

import { promises as fs } from "node:fs";
import { dirname, join } from "node:path";
import { storageConfig } from "../storage-config";
import type { CloudStorageProvider } from "./cloud-storage-provider";

const CV_DIR = "cv-uploads";
const JD_DIR = "jd-uploads";

export class LocalStorageProvider implements CloudStorageProvider {
  private baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir =
      baseDir ?? join(process.cwd(), storageConfig.localStorageDir);
  }

  async uploadCV(hash: string, buffer: Buffer): Promise<string> {
    const path = `cv/${hash}`;
    await this.uploadFile(CV_DIR, hash, buffer);
    return path;
  }

  async uploadJobDescription(hash: string, buffer: Buffer): Promise<string> {
    const path = `jd/${hash}`;
    await this.uploadFile(JD_DIR, hash, buffer);
    return path;
  }

  async getSignedUrl(type: "cv" | "jd", path: string): Promise<string> {
    // In development, return a local file URL (no signing needed)
    const dir = type === "cv" ? CV_DIR : JD_DIR;
    const filename = path.replace(`${type}/`, "");
    return `/local-storage/${dir}/${filename}`;
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
    buffer: Buffer,
  ): Promise<void> {
    const fullPath = join(this.baseDir, dir, filename);

    // Ensure directory exists
    await fs.mkdir(dirname(fullPath), { recursive: true });

    // Write file
    await fs.writeFile(fullPath, buffer);
  }

  private async deleteFile(dir: string, filename: string): Promise<void> {
    const fullPath = join(this.baseDir, dir, filename);

    try {
      await fs.unlink(fullPath);
    } catch (error) {
      // Ignore ENOENT errors - file may already be deleted
      if (
        error instanceof Error &&
        "code" in error &&
        (error as NodeJS.ErrnoException).code === "ENOENT"
      ) {
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
