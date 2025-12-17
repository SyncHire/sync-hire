/**
 * Interview UI Types
 *
 * Types used for the interview UI that aren't stored in the database.
 * These are derived from interview questions and used for display/interaction.
 */

/**
 * Interview stages for categorizing questions
 */
export type InterviewStage =
  | "Introduction"
  | "Technical Skills"
  | "Problem Solving"
  | "Behavioral"
  | "Wrap-up";

/**
 * Question format for interview UI display
 */
export interface Question {
  id: string;
  text: string;
  type: "video" | "text" | "code";
  duration: number;
  category: InterviewStage;
  keyPoints?: string[];
}

/**
 * All possible interview stages in order
 */
export const INTERVIEW_STAGES: InterviewStage[] = [
  "Introduction",
  "Technical Skills",
  "Problem Solving",
  "Behavioral",
  "Wrap-up",
];

/**
 * JobApplication represents a job from the candidate's perspective
 * Includes the full job details plus candidate-specific application data
 */
export interface JobApplication {
  id: string;
  job: import("@/lib/storage/storage-interface").Job;
  candidateId: string;
  matchPercentage: number;
  status: "NOT_APPLIED" | "APPLIED" | "INTERVIEWING" | "COMPLETED";
  interviewId?: string;
  appliedAt?: Date;
  createdAt: Date;
}

/**
 * AI Evaluation result from interview analysis
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

/**
 * Employment type options for job creation
 * Note: Types are defined in @sync-hire/database, these are the UI arrays
 */
export const EMPLOYMENT_TYPES = [
  "Full-time",
  "Part-time",
  "Contract",
  "Temporary",
  "Internship",
  "Not specified",
] as const;

/**
 * Work arrangement options for job creation
 * Note: Types are defined in @sync-hire/database, these are the UI arrays
 */
export const WORK_ARRANGEMENTS = [
  "Remote",
  "Hybrid",
  "On-site",
  "Flexible",
  "Not specified",
] as const;

/**
 * Question type for API responses
 */
export type QuestionType = "video" | "text" | "code";
