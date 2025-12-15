/**
 * File-based Storage Implementation
 *
 * Stores extracted job/CV data, uploads, and created job postings in the file system.
 * Can be easily migrated to database later without changing the interface.
 */

import { promises as fs } from "fs";
import { join } from "path";
import type {
  CandidateApplication,
  ExtractedCVData,
  ExtractedJobData,
  Interview,
  Job,
  InterviewQuestions,
  Notification,
  Organization,
  User,
  StorageInterface,
} from "./storage-interface";
import {
  getDemoUser,
  getInterviewById as getMockInterviewById,
  getAllInterviews as getMockInterviews,
  getOrganizationById,
  getUserById,
} from "@/lib/mock-data";
import { mockInterviewToInterview } from "@/lib/utils/type-adapters";
import { generateStringHash } from "@/lib/utils/hash-utils";

const DATA_DIR = join(process.cwd(), "data");
const JD_EXTRACTIONS_DIR = join(DATA_DIR, "jd-extractions");
const CV_EXTRACTIONS_DIR = join(DATA_DIR, "cv-extractions");
const JOBS_DIR = join(DATA_DIR, "jobs");
const QUESTIONS_SET_DIR = join(DATA_DIR, "questions-set");
const INTERVIEWS_DIR = join(DATA_DIR, "interviews");
const USERS_DIR = join(DATA_DIR, "users");
const USER_CVS_DIR = join(DATA_DIR, "user-cvs");
const NOTIFICATIONS_DIR = join(DATA_DIR, "notifications");
const APPLICATIONS_DIR = join(DATA_DIR, "applications");

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

  async saveExtraction(hash: string, data: ExtractedJobData, _organizationId: string, _createdById: string): Promise<void> {
    try {
      await fs.mkdir(JD_EXTRACTIONS_DIR, { recursive: true });
      const filePath = join(JD_EXTRACTIONS_DIR, `${hash}.json`);
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error("Failed to save job extraction:", error);
      throw error;
    }
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
    // File storage only returns jobs stored in files, no mock fallback
    // Mock jobs have incompatible structure (different field names)
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

  // Interview Questions methods
  async getInterviewQuestions(
    cvId: string,
    jobId: string,
  ): Promise<InterviewQuestions | null> {
    try {
      const hash = generateStringHash(cvId + jobId);
      const filePath = join(QUESTIONS_SET_DIR, `${hash}.json`);
      const data = await fs.readFile(filePath, "utf-8");
      return JSON.parse(data) as InterviewQuestions;
    } catch (error) {
      // Only log if it's NOT a "file not found" error (expected case)
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        console.error(`[FileStorage.getInterviewQuestions] Unexpected error for cvId: ${cvId}, jobId: ${jobId}:`, error);
      }
      return null;
    }
  }

  async saveInterviewQuestions(
    cvId: string,
    jobId: string,
    data: InterviewQuestions,
  ): Promise<void> {
    try {
      const hash = generateStringHash(cvId + jobId);
      await fs.mkdir(QUESTIONS_SET_DIR, { recursive: true });
      const filePath = join(QUESTIONS_SET_DIR, `${hash}.json`);
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error("Failed to save interview questions:", error);
      throw error;
    }
  }

  async hasInterviewQuestions(cvId: string, jobId: string): Promise<boolean> {
    try {
      const hash = generateStringHash(cvId + jobId);
      const filePath = join(QUESTIONS_SET_DIR, `${hash}.json`);
      await fs.access(filePath);
      return true;
    } catch (error) {
      // Only log if it's NOT a "file not found" error (expected case)
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        console.error(`[FileStorage.hasInterviewQuestions] Unexpected error for cvId: ${cvId}, jobId: ${jobId}:`, error);
      }
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
      // Fall back to mock data and convert to database Interview type
      const mockInterview = getMockInterviewById(id);
      return mockInterview ? mockInterviewToInterview(mockInterview) : null;
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

      // Get mock interviews and convert to database Interview type
      const mockInterviews = getMockInterviews().map(mockInterviewToInterview);

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
      return getMockInterviews().map(mockInterviewToInterview);
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
      const mockUser = getUserById(id);
      if (!mockUser) {
        return null;
      }
      return {
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        emailVerified: false,
        image: null,
        password: null,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.createdAt,
      };
    }
  }

  async getCurrentUser(): Promise<User> {
    // For now, always return demo user
    // In future: integrate with auth system
    const mockUser = getDemoUser();
    return {
      id: mockUser.id,
      name: mockUser.name,
      email: mockUser.email,
      emailVerified: false,
      image: null,
      password: null,
      createdAt: mockUser.createdAt,
      updatedAt: mockUser.createdAt,
    };
  }

  // =============================================================================
  // Organization Methods
  // =============================================================================

  async getOrganization(id: string): Promise<Organization | null> {
    // File storage uses mock organizations
    const mockOrg = getOrganizationById(id);
    if (!mockOrg) {
      return null;
    }
    const now = new Date();
    return {
      id: mockOrg.id,
      name: mockOrg.name,
      slug: mockOrg.slug,
      logo: null,
      website: null,
      description: null,
      industry: null,
      size: null,
      createdAt: now,
      updatedAt: now,
    };
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

  // =============================================================================
  // Candidate Application Methods
  // =============================================================================

  async getApplicationsForJob(jobId: string): Promise<CandidateApplication[]> {
    try {
      const jobApplicationsDir = join(APPLICATIONS_DIR, jobId);
      const files = await fs.readdir(jobApplicationsDir);
      const applications: CandidateApplication[] = [];

      for (const file of files) {
        if (file.endsWith(".json")) {
          try {
            const filePath = join(jobApplicationsDir, file);
            const data = await fs.readFile(filePath, "utf-8");
            applications.push(JSON.parse(data) as CandidateApplication);
          } catch (error) {
            console.error(`Failed to read application file ${file}:`, error);
          }
        }
      }

      // Sort by matchScore descending (highest first)
      return applications.sort((a, b) => b.matchScore - a.matchScore);
    } catch {
      // Directory doesn't exist yet, return empty array
      return [];
    }
  }

  async getApplication(applicationId: string): Promise<CandidateApplication | null> {
    try {
      // Search for application in all job directories
      const jobDirs = await fs.readdir(APPLICATIONS_DIR);
      for (const jobDir of jobDirs) {
        const filePath = join(APPLICATIONS_DIR, jobDir, `${applicationId}.json`);
        try {
          const data = await fs.readFile(filePath, "utf-8");
          return JSON.parse(data) as CandidateApplication;
        } catch {
          // File doesn't exist in this directory, continue
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  async getOrCreateApplication(cvHash: string, jobId: string): Promise<CandidateApplication> {
    const user = await this.getCurrentUser();

    // Check existing applications for this job
    const jobApplicationsDir = join(APPLICATIONS_DIR, jobId);
    try {
      const files = await fs.readdir(jobApplicationsDir);
      for (const file of files) {
        if (file.endsWith(".json")) {
          const filePath = join(jobApplicationsDir, file);
          const data = await fs.readFile(filePath, "utf-8");
          const application = JSON.parse(data) as CandidateApplication;
          // Match by userId
          if (application.userId === user.id) {
            return application;
          }
        }
      }
    } catch {
      // Directory doesn't exist yet, will create below
    }

    // Create new application
    const now = new Date();
    const application: CandidateApplication = {
      id: `app-${Date.now()}`,
      jobId,
      cvUploadId: cvHash,
      userId: user.id,
      candidateName: user.name,
      candidateEmail: user.email,
      matchScore: 0,
      matchReasons: [],
      skillGaps: [],
      status: "GENERATING_QUESTIONS",
      source: "MANUAL_APPLY",
      interviewId: null,
      questionsData: null,
      createdAt: now,
      updatedAt: now,
    };

    await this.saveApplication(application);
    return application;
  }

  async saveApplication(application: CandidateApplication): Promise<void> {
    try {
      const jobApplicationsDir = join(APPLICATIONS_DIR, application.jobId);
      await fs.mkdir(jobApplicationsDir, { recursive: true });
      const filePath = join(jobApplicationsDir, `${application.id}.json`);
      await fs.writeFile(filePath, JSON.stringify(application, null, 2));
    } catch (error) {
      console.error("Failed to save application:", error);
      throw error;
    }
  }

  async getAllCVExtractions(): Promise<Array<{ cvId: string; userId: string; data: ExtractedCVData }>> {
    try {
      const files = await fs.readdir(CV_EXTRACTIONS_DIR);
      const extractions: Array<{ cvId: string; userId: string; data: ExtractedCVData }> = [];

      for (const file of files) {
        if (file.endsWith(".json")) {
          try {
            const filePath = join(CV_EXTRACTIONS_DIR, file);
            const data = await fs.readFile(filePath, "utf-8");
            const cvId = file.replace(".json", "");
            extractions.push({
              cvId,
              userId: "demo-user", // File storage doesn't track userId, use default
              data: JSON.parse(data) as ExtractedCVData,
            });
          } catch (error) {
            console.error(`Failed to read CV extraction file ${file}:`, error);
          }
        }
      }

      return extractions;
    } catch {
      // Directory doesn't exist yet, return empty array
      return [];
    }
  }
}
