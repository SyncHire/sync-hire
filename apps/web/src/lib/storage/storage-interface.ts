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
  JobWithQuestionsAndOrg,
  Notification,
  Organization,
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
  Organization,
  User,
};

// Export Job type as JobWithQuestionsAndOrg since we need both questions and organization
export type Job = JobWithQuestionsAndOrg;

export interface StorageInterface {
  /**
   * Get job extraction data by hash ID
   */
  getExtraction(hash: string): Promise<ExtractedJobData | null>;

  /**
   * Save job extraction data with hash key
   * @param organizationId - The organization ID to associate with the job
   * @param createdById - The user ID who created this extraction
   */
  saveExtraction(hash: string, data: ExtractedJobData, organizationId: string, createdById: string): Promise<void>;

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
   * Check if CV extraction exists
   */
  hasCVExtraction(hash: string): Promise<boolean>;

  /**
   * Get interview questions by cvId and jobId
   */
  getInterviewQuestions(cvId: string, jobId: string): Promise<InterviewQuestions | null>;

  /**
   * Save interview questions for a CV/job combination
   */
  saveInterviewQuestions(cvId: string, jobId: string, data: InterviewQuestions): Promise<void>;

  /**
   * Check if interview questions exist for a CV/job combination
   */
  hasInterviewQuestions(cvId: string, jobId: string): Promise<boolean>;

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
  // Organization Methods
  // =============================================================================

  /**
   * Get organization by ID
   */
  getOrganization(id: string): Promise<Organization | null>;

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
   * Get application by interview ID (direct lookup, avoids loading all job applications)
   */
  getApplicationByInterviewId(interviewId: string): Promise<CandidateApplication | null>;

  /**
   * Get or create application for a CV and job combination
   * Creates application if it doesn't exist for the current user
   */
  getOrCreateApplication(cvHash: string, jobId: string): Promise<CandidateApplication>;

  /**
   * Save/update a candidate application (upserts by jobId + userId)
   * Returns the saved application with its database-generated ID
   */
  saveApplication(application: Omit<CandidateApplication, 'id'>): Promise<CandidateApplication>;

  /**
   * Get all CV extractions (for AI matching)
   * Returns cvId (the CVUpload.id), userId, and extracted data
   */
  getAllCVExtractions(): Promise<Array<{ cvId: string; userId: string; data: ExtractedCVData }>>;
}
