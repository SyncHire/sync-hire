/**
 * File-based Storage Implementation
 *
 * Stores extracted job data and uploads in the file system.
 * Can be easily migrated to database later without changing the interface.
 */

import { promises as fs } from "fs";
import { join } from "path";
import type { ExtractedJobData } from "@/lib/mock-data";
import type { StorageInterface } from "./storage-interface";

const DATA_DIR = join(process.cwd(), "data");
const EXTRACTIONS_DIR = join(DATA_DIR, "jd-extractions");
const UPLOADS_DIR = join(DATA_DIR, "jd-uploads");

export class FileStorage implements StorageInterface {
  async getExtraction(hash: string): Promise<ExtractedJobData | null> {
    try {
      const filePath = join(EXTRACTIONS_DIR, `${hash}.json`);
      const data = await fs.readFile(filePath, "utf-8");
      return JSON.parse(data) as ExtractedJobData;
    } catch {
      return null;
    }
  }

  async saveExtraction(
    hash: string,
    data: ExtractedJobData
  ): Promise<void> {
    try {
      await fs.mkdir(EXTRACTIONS_DIR, { recursive: true });
      const filePath = join(EXTRACTIONS_DIR, `${hash}.json`);
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error("Failed to save extraction:", error);
      throw error;
    }
  }

  async saveUpload(hash: string, buffer: Buffer): Promise<string> {
    try {
      await fs.mkdir(UPLOADS_DIR, { recursive: true });
      const filePath = join(UPLOADS_DIR, hash);
      await fs.writeFile(filePath, buffer);
      return filePath;
    } catch (error) {
      console.error("Failed to save upload:", error);
      throw error;
    }
  }

  getUploadPath(hash: string): string {
    return join(UPLOADS_DIR, hash);
  }

  async hasExtraction(hash: string): Promise<boolean> {
    try {
      const filePath = join(EXTRACTIONS_DIR, `${hash}.json`);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
