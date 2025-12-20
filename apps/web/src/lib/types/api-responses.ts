/**
 * API Response Types
 *
 * Separate response interfaces for HR and Candidate views to:
 * - Limit data exposure for candidates
 * - Enable clear permission boundaries
 * - Provide type safety for API consumers
 */

import type { ApplicationStatus, InterviewStatus } from "@sync-hire/database";

// =============================================================================
// Interview Response Types
// =============================================================================

/**
 * HR view of an interview - full data including PII and evaluations
 */
export interface HRInterviewResponse {
  id: string;
  jobId: string;
  jobTitle: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  status: InterviewStatus;
  callId: string | null;
  transcript: string | null;
  score: number | null;
  aiEvaluation: AIEvaluation | null;
  durationMinutes: number;
  createdAt: Date;
  completedAt: Date | null;
}

/**
 * Candidate view of their own interview - limited data
 * NO: transcript, other candidate info
 * YES: aiEvaluation (candidates can see their own performance feedback)
 */
export interface CandidateInterviewResponse {
  id: string;
  jobId: string;
  jobTitle: string;
  companyName: string;
  status: InterviewStatus;
  score: number | null; // Candidate can see their own score
  aiEvaluation: AIEvaluation | null; // Candidate can see their own evaluation
  durationMinutes: number;
  createdAt: Date;
  completedAt: Date | null;
}

/**
 * AI evaluation structure (HR only)
 */
export interface AIEvaluation {
  overallScore: number;
  categories: {
    technicalKnowledge: number;
    problemSolving: number;
    communication: number;
    experienceRelevance: number;
  };
  strengths: string[];
  improvements: string[];
  summary: string;
}

// =============================================================================
// Application Response Types
// =============================================================================

/**
 * HR view of an application - full data including match analysis
 */
export interface HRApplicationResponse {
  id: string;
  jobId: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  matchScore: number;
  matchReasons: string[];
  skillGaps: string[];
  status: ApplicationStatus;
  cvUploadId: string;
  interviewId: string | null;
  createdAt: Date;
}

/**
 * Candidate view of their own application - limited data
 * NO: matchReasons, skillGaps (internal HR analysis)
 */
export interface CandidateApplicationResponse {
  id: string;
  jobId: string;
  jobTitle: string;
  companyName: string;
  matchScore: number;
  status: ApplicationStatus;
  interviewId: string | null;
  createdAt: Date;
}

// =============================================================================
// Job Response Types
// =============================================================================

/**
 * Public job view - limited fields for candidates browsing jobs
 */
export interface PublicJobResponse {
  id: string;
  title: string;
  department: string | null;
  location: string;
  employmentType: string;
  workArrangement: string | null;
  salary: string | null;
  description: string;
  requirements: string[];
  postedAt: Date;
  questions?: PublicJobQuestion[];
}

/**
 * Public job question - no internal IDs exposed
 */
export interface PublicJobQuestion {
  content: string;
  type: string;
  duration: number;
  category: string | null;
}

/**
 * HR view of a job - full data including internal settings
 */
export interface HRJobResponse {
  id: string;
  title: string;
  organizationId: string;
  createdById: string;
  department: string | null;
  location: string;
  employmentType: string;
  workArrangement: string | null;
  salary: string | null;
  description: string;
  requirements: string[];
  status: string;
  aiMatchingEnabled: boolean;
  aiMatchingThreshold: number;
  aiMatchingStatus: string;
  jdFileUrl: string | null;
  jdExtraction: unknown;
  postedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  applicantsCount: number;
  questions: HRJobQuestion[];
}

/**
 * HR view of job question - includes IDs for management
 */
export interface HRJobQuestion {
  id: string;
  content: string;
  type: string;
  duration: number;
  category: string | null;
  order: number;
}
