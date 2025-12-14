/**
 * Storage Interface for Job Description Extractions, CV Extractions, Job Postings, and Interview Questions
 *
 * Provides abstraction for storing and retrieving extracted job data, CV data, created jobs, and generated interview questions.
 * Can be implemented with files, database, or cloud storage.
 */

import type {
  CandidateApplication,
  ExtractedCVData,
  ExtractedJobData,
  Interview,
  InterviewQuestions,
  JobWithQuestions,
  Notification,
  User,
} from "@sync-hire/database";

// Re-export types for convenience
export type {
  CandidateApplication,
  ExtractedCVData,
  ExtractedJobData,
  Interview,
  InterviewQuestions,
  Notification,
  User,
};

// Export Job type as JobWithQuestions since we always need questions relation
export type Job = JobWithQuestions;

export interface StorageInterface {
  /**
   * Get job extraction data by hash ID
   */
  getExtraction(hash: string): Promise<ExtractedJobData | null>;

  /**
   * Save job extraction data with hash key
   */
  saveExtraction(hash: string, data: ExtractedJobData): Promise<void>;

  /**
   * Upload job description PDF file and return URL
   */
  uploadJobDescription(hash: string, buffer: Buffer): Promise<string>;

  /**
   * Get path/URL to uploaded job description file
   */
  getJobDescriptionPath(hash: string): string;

  /**
   * Check if job extraction exists
   */
  hasExtraction(hash: string): Promise<boolean>;

  /**
   * Save job posting data
   */
  saveJob(id: string, job: Job): Promise<void>;

  /**
   * Get job posting by ID
   */
  getJob(id: string): Promise<Job | null>;

  /**
   * Get all stored job postings
   */
  getAllStoredJobs(): Promise<Job[]>;

  /**
   * Check if job exists
   */
  hasJob(id: string): Promise<boolean>;

  /**
   * Get CV extraction data by hash ID
   */
  getCVExtraction(hash: string): Promise<ExtractedCVData | null>;

  /**
   * Save CV extraction data with hash key
   */
  saveCVExtraction(hash: string, data: ExtractedCVData): Promise<void>;

  /**
   * Upload CV PDF file and return URL
   */
  uploadCV(hash: string, buffer: Buffer): Promise<string>;

  /**
   * Get path/URL to uploaded CV file
   */
  getCVPath(hash: string): string;

  /**
   * Check if CV extraction exists
   */
  hasCVExtraction(hash: string): Promise<boolean>;

  /**
   * Get interview questions by combined hash (cvId + jobId)
   * Questions are stored in /data/questions-set/ directory
   */
  getInterviewQuestions(hash: string): Promise<InterviewQuestions | null>;

  /**
   * Save interview questions with combined hash key
   * Questions are stored in /data/questions-set/{hash}.json
   */
  saveInterviewQuestions(hash: string, data: InterviewQuestions): Promise<void>;

  /**
   * Check if interview questions exist in questions-set storage
   */
  hasInterviewQuestions(hash: string): Promise<boolean>;

  // =============================================================================
  // Interview Methods
  // =============================================================================

  /**
   * Get interview by ID
   */
  getInterview(id: string): Promise<Interview | null>;

  /**
   * Get all interviews
   */
  getAllInterviews(): Promise<Interview[]>;

  /**
   * Get interviews for a specific user
   */
  getInterviewsForUser(userId: string): Promise<Interview[]>;

  /**
   * Save interview data
   */
  saveInterview(id: string, interview: Interview): Promise<void>;

  // =============================================================================
  // User Methods
  // =============================================================================

  /**
   * Get user by ID
   */
  getUser(id: string): Promise<User | null>;

  /**
   * Get current/demo user
   */
  getCurrentUser(): Promise<User>;

  // =============================================================================
  // User CV Methods
  // =============================================================================

  /**
   * Get the CV ID associated with a user
   */
  getUserCVId(userId: string): Promise<string | null>;

  /**
   * Save/link a CV ID to a user
   */
  saveUserCVId(userId: string, cvId: string): Promise<void>;

  // =============================================================================
  // Notification Methods
  // =============================================================================

  /**
   * Get all notifications for a user
   */
  getNotifications(userId: string): Promise<Notification[]>;

  /**
   * Save a notification
   */
  saveNotification(notification: Notification): Promise<void>;

  /**
   * Mark a notification as read
   */
  markNotificationRead(notificationId: string): Promise<void>;

  // =============================================================================
  // Candidate Application Methods
  // =============================================================================

  /**
   * Get all applications for a job
   */
  getApplicationsForJob(jobId: string): Promise<CandidateApplication[]>;

  /**
   * Get a specific application by ID
   */
  getApplication(applicationId: string): Promise<CandidateApplication | null>;

  /**
   * Save/update a candidate application
   */
  saveApplication(application: CandidateApplication): Promise<void>;

  /**
   * Get all CV extractions (for AI matching)
   * Returns cvId (the CVUpload.id), userId, and extracted data
   */
  getAllCVExtractions(): Promise<Array<{ cvId: string; userId: string; data: ExtractedCVData }>>;
}
