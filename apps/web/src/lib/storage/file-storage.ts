/**
 * File-based Storage Implementation
 *
 * Stores extracted job/CV data, uploads, and created job postings in the file system.
 * Can be easily migrated to database later without changing the interface.
 */

import { promises as fs } from "fs";
import { join } from "path";
import type {
  ExtractedCVData,
  ExtractedJobData,
  Interview,
  Job,
  Notification,
  User,
} from "@/lib/mock-data";
import {
  getDemoUser,
  getInterviewById as getMockInterviewById,
  getAllInterviews as getMockInterviews,
  getInterviewsForUser as getMockInterviewsForUser,
  getJobById as getMockJobById,
  getUserById,
} from "@/lib/mock-data";
import type { InterviewQuestions, StorageInterface } from "./storage-interface";

const DATA_DIR = join(process.cwd(), "data");
const JD_EXTRACTIONS_DIR = join(DATA_DIR, "jd-extractions");
const JD_UPLOADS_DIR = join(DATA_DIR, "jd-uploads");
const CV_EXTRACTIONS_DIR = join(DATA_DIR, "cv-extractions");
const CV_UPLOADS_DIR = join(DATA_DIR, "cv-uploads");
const JOBS_DIR = join(DATA_DIR, "jobs");
const QUESTIONS_SET_DIR = join(DATA_DIR, "questions-set");
const INTERVIEWS_DIR = join(DATA_DIR, "interviews");
const USERS_DIR = join(DATA_DIR, "users");
const USER_CVS_DIR = join(DATA_DIR, "user-cvs");
const NOTIFICATIONS_DIR = join(DATA_DIR, "notifications");

export class FileStorage implements StorageInterface {
  // Job Description methods
  async getExtraction(hash: string): Promise<ExtractedJobData | null> {
    try {
      const filePath = join(JD_EXTRACTIONS_DIR, `${hash}.json`);
      const data = await fs.readFile(filePath, "utf-8");
      return JSON.parse(data) as ExtractedJobData;
    } catch {
      return null;
    }
  }

  async saveExtraction(hash: string, data: ExtractedJobData): Promise<void> {
    try {
      await fs.mkdir(JD_EXTRACTIONS_DIR, { recursive: true });
      const filePath = join(JD_EXTRACTIONS_DIR, `${hash}.json`);
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error("Failed to save job extraction:", error);
      throw error;
    }
  }

  async saveUpload(hash: string, buffer: Buffer): Promise<string> {
    try {
      await fs.mkdir(JD_UPLOADS_DIR, { recursive: true });
      const filePath = join(JD_UPLOADS_DIR, hash);
      await fs.writeFile(filePath, buffer);
      return filePath;
    } catch (error) {
      console.error("Failed to save job upload:", error);
      throw error;
    }
  }

  getUploadPath(hash: string): string {
    return join(JD_UPLOADS_DIR, hash);
  }

  async hasExtraction(hash: string): Promise<boolean> {
    try {
      const filePath = join(JD_EXTRACTIONS_DIR, `${hash}.json`);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  // CV methods
  async getCVExtraction(hash: string): Promise<ExtractedCVData | null> {
    try {
      const filePath = join(CV_EXTRACTIONS_DIR, `${hash}.json`);
      const data = await fs.readFile(filePath, "utf-8");
      return JSON.parse(data) as ExtractedCVData;
    } catch {
      return null;
    }
  }

  async saveCVExtraction(hash: string, data: ExtractedCVData): Promise<void> {
    try {
      await fs.mkdir(CV_EXTRACTIONS_DIR, { recursive: true });
      const filePath = join(CV_EXTRACTIONS_DIR, `${hash}.json`);
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error("Failed to save CV extraction:", error);
      throw error;
    }
  }

  async saveCVUpload(hash: string, buffer: Buffer): Promise<string> {
    try {
      await fs.mkdir(CV_UPLOADS_DIR, { recursive: true });
      const filePath = join(CV_UPLOADS_DIR, hash);
      await fs.writeFile(filePath, buffer);
      return filePath;
    } catch (error) {
      console.error("Failed to save CV upload:", error);
      throw error;
    }
  }

  getCVUploadPath(hash: string): string {
    return join(CV_UPLOADS_DIR, hash);
  }

  async hasCVExtraction(hash: string): Promise<boolean> {
    try {
      const filePath = join(CV_EXTRACTIONS_DIR, `${hash}.json`);
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
    // Try file storage first
    try {
      const filePath = join(JOBS_DIR, `${id}.json`);
      const data = await fs.readFile(filePath, "utf-8");
      return JSON.parse(data) as Job;
    } catch {
      // Fall back to mock data
      return getMockJobById(id) || null;
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

  // Interview Questions methods
  async getInterviewQuestions(
    hash: string,
  ): Promise<InterviewQuestions | null> {
    try {
      const filePath = join(QUESTIONS_SET_DIR, `${hash}.json`);
      const data = await fs.readFile(filePath, "utf-8");
      return JSON.parse(data) as InterviewQuestions;
    } catch {
      return null;
    }
  }

  async saveInterviewQuestions(
    hash: string,
    data: InterviewQuestions,
  ): Promise<void> {
    try {
      await fs.mkdir(QUESTIONS_SET_DIR, { recursive: true });
      const filePath = join(QUESTIONS_SET_DIR, `${hash}.json`);
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error("Failed to save interview questions:", error);
      throw error;
    }
  }

  async hasInterviewQuestions(hash: string): Promise<boolean> {
    try {
      const filePath = join(QUESTIONS_SET_DIR, `${hash}.json`);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  // =============================================================================
  // Interview Methods
  // =============================================================================

  async getInterview(id: string): Promise<Interview | null> {
    // Try file storage first
    try {
      const filePath = join(INTERVIEWS_DIR, `${id}.json`);
      const data = await fs.readFile(filePath, "utf-8");
      return JSON.parse(data) as Interview;
    } catch {
      // Fall back to mock data
      return getMockInterviewById(id) || null;
    }
  }

  async getAllInterviews(): Promise<Interview[]> {
    try {
      // Get interviews from file storage
      const storedInterviews: Interview[] = [];
      try {
        const files = await fs.readdir(INTERVIEWS_DIR);
        for (const file of files) {
          if (file.endsWith(".json")) {
            try {
              const filePath = join(INTERVIEWS_DIR, file);
              const data = await fs.readFile(filePath, "utf-8");
              storedInterviews.push(JSON.parse(data) as Interview);
            } catch (error) {
              console.error(`Failed to read interview file ${file}:`, error);
            }
          }
        }
      } catch {
        // Directory doesn't exist yet, that's fine
      }

      // Get mock interviews
      const mockInterviews = getMockInterviews();

      // Merge: stored interviews override mock interviews with same ID
      const interviewMap = new Map<string, Interview>();
      mockInterviews.forEach((interview) =>
        interviewMap.set(interview.id, interview),
      );
      storedInterviews.forEach((interview) =>
        interviewMap.set(interview.id, interview),
      );

      return Array.from(interviewMap.values());
    } catch (error) {
      console.error("Failed to fetch interviews:", error);
      return getMockInterviews();
    }
  }

  async getInterviewsForUser(userId: string): Promise<Interview[]> {
    const allInterviews = await this.getAllInterviews();
    return allInterviews.filter(
      (interview) => interview.candidateId === userId,
    );
  }

  async saveInterview(id: string, interview: Interview): Promise<void> {
    try {
      await fs.mkdir(INTERVIEWS_DIR, { recursive: true });
      const filePath = join(INTERVIEWS_DIR, `${id}.json`);
      await fs.writeFile(filePath, JSON.stringify(interview, null, 2));
    } catch (error) {
      console.error("Failed to save interview:", error);
      throw error;
    }
  }

  // =============================================================================
  // User Methods
  // =============================================================================

  async getUser(id: string): Promise<User | null> {
    // Try file storage first
    try {
      const filePath = join(USERS_DIR, `${id}.json`);
      const data = await fs.readFile(filePath, "utf-8");
      return JSON.parse(data) as User;
    } catch {
      // Fall back to mock data
      return getUserById(id) || null;
    }
  }

  async getCurrentUser(): Promise<User> {
    // For now, always return demo user
    // In future: integrate with auth system
    return getDemoUser();
  }

  // =============================================================================
  // User CV Methods
  // =============================================================================

  async getUserCVId(userId: string): Promise<string | null> {
    try {
      const filePath = join(USER_CVS_DIR, `${userId}.json`);
      const data = await fs.readFile(filePath, "utf-8");
      const parsed = JSON.parse(data);
      return parsed.cvId || null;
    } catch {
      return null;
    }
  }

  async saveUserCVId(userId: string, cvId: string): Promise<void> {
    try {
      await fs.mkdir(USER_CVS_DIR, { recursive: true });
      const filePath = join(USER_CVS_DIR, `${userId}.json`);
      await fs.writeFile(
        filePath,
        JSON.stringify({ cvId, updatedAt: new Date().toISOString() }, null, 2),
      );
    } catch (error) {
      console.error("Failed to save user CV ID:", error);
      throw error;
    }
  }

  // =============================================================================
  // Notification Methods
  // =============================================================================

  async getNotifications(userId: string): Promise<Notification[]> {
    try {
      const userNotificationsDir = join(NOTIFICATIONS_DIR, userId);
      const files = await fs.readdir(userNotificationsDir);
      const notifications: Notification[] = [];

      for (const file of files) {
        if (file.endsWith(".json")) {
          try {
            const filePath = join(userNotificationsDir, file);
            const data = await fs.readFile(filePath, "utf-8");
            notifications.push(JSON.parse(data) as Notification);
          } catch (error) {
            console.error(`Failed to read notification file ${file}:`, error);
          }
        }
      }

      // Sort by createdAt descending (newest first)
      return notifications.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    } catch {
      // Directory doesn't exist yet, return empty array
      return [];
    }
  }

  async saveNotification(notification: Notification): Promise<void> {
    try {
      const userNotificationsDir = join(NOTIFICATIONS_DIR, notification.userId);
      await fs.mkdir(userNotificationsDir, { recursive: true });
      const filePath = join(userNotificationsDir, `${notification.id}.json`);
      await fs.writeFile(filePath, JSON.stringify(notification, null, 2));
    } catch (error) {
      console.error("Failed to save notification:", error);
      throw error;
    }
  }

  async markNotificationRead(notificationId: string): Promise<void> {
    try {
      // Search for notification in all user directories
      const userDirs = await fs.readdir(NOTIFICATIONS_DIR);
      for (const userDir of userDirs) {
        const filePath = join(
          NOTIFICATIONS_DIR,
          userDir,
          `${notificationId}.json`,
        );
        try {
          const data = await fs.readFile(filePath, "utf-8");
          const notification = JSON.parse(data) as Notification;
          notification.read = true;
          await fs.writeFile(filePath, JSON.stringify(notification, null, 2));
          return;
        } catch {
          // File doesn't exist in this directory, continue
        }
      }
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
      throw error;
    }
  }
}
