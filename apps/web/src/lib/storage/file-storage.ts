/**
 * File-based Storage Implementation
 *
 * Stores extracted job data, uploads, and created job postings in the file system.
 * Can be easily migrated to database later without changing the interface.
 */

import { promises as fs } from "fs";
import { join } from "path";
import type { ExtractedJobData, Job } from "@/lib/mock-data";
import type { StorageInterface } from "./storage-interface";

const DATA_DIR = join(process.cwd(), "data");
const EXTRACTIONS_DIR = join(DATA_DIR, "jd-extractions");
const UPLOADS_DIR = join(DATA_DIR, "jd-uploads");
const JOBS_DIR = join(DATA_DIR, "jobs");

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

  async saveJob(id: string, job: Job): Promise<void> {
    try {
      await fs.mkdir(JOBS_DIR, { recursive: true });
      const filePath = join(JOBS_DIR, `${id}.json`);
      await fs.writeFile(filePath, JSON.stringify(job, null, 2));
    } catch (error) {
      console.error("Failed to save job:", error);
      throw error;
    }
  }

  async getJob(id: string): Promise<Job | null> {
    try {
      const filePath = join(JOBS_DIR, `${id}.json`);
      const data = await fs.readFile(filePath, "utf-8");
      return JSON.parse(data) as Job;
    } catch {
      return null;
    }
  }

  async getAllStoredJobs(): Promise<Job[]> {
    try {
      const files = await fs.readdir(JOBS_DIR);
      const jobs: Job[] = [];

      for (const file of files) {
        if (file.endsWith(".json")) {
          try {
            const filePath = join(JOBS_DIR, file);
            const data = await fs.readFile(filePath, "utf-8");
            const job = JSON.parse(data) as Job;
            jobs.push(job);
          } catch (error) {
            console.error(`Failed to read job file ${file}:`, error);
          }
        }
      }

      return jobs;
    } catch (error) {
      // Directory doesn't exist yet
      return [];
    }
  }

  async hasJob(id: string): Promise<boolean> {
    try {
      const filePath = join(JOBS_DIR, `${id}.json`);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
