/**
 * JSON Field Types for Prisma Schema
 *
 * Defines TypeScript interfaces for JSON fields stored in the database.
 * Use type guards for runtime validation.
 */

// =============================================================================
// Job Description Extraction (Job.jdExtraction)
// =============================================================================

export type EmploymentType = 'Full-time' | 'Part-time' | 'Contract' | 'Internship';
export type WorkArrangement = 'On-site' | 'Remote' | 'Hybrid';

export interface ExtractedJobData {
  title: string;
  company: string;
  responsibilities: string[];
  requirements: string[];
  seniority: string;
  location: string;
  employmentType: EmploymentType;
  workArrangement: WorkArrangement;
}

// =============================================================================
// CV Extraction (CVUpload.extraction)
// =============================================================================

export type LanguageProficiency = 'Basic' | 'Intermediate' | 'Advanced' | 'Fluent' | 'Native';

export interface ExtractedCVData {
  personalInfo: {
    fullName: string;
    email?: string;
    phone?: string;
    location?: string;
    summary?: string;
    linkedinUrl?: string;
    githubUrl?: string;
    portfolioUrl?: string;
  };
  experience: Array<{
    title: string;
    company: string;
    location?: string;
    startDate: string; // ISO 8601 date string (e.g., '2024-01-15' or '2024-01-15T10:30:00Z')
    endDate?: string; // ISO 8601 date string (e.g., '2024-01-15' or '2024-01-15T10:30:00Z')
    current: boolean;
    description: string[];
  }>;
  education: Array<{
    degree: string;
    field: string;
    institution: string;
    location?: string;
    startDate: string; // ISO 8601 date string (e.g., '2024-01-15' or '2024-01-15T10:30:00Z')
    endDate?: string; // ISO 8601 date string (e.g., '2024-01-15' or '2024-01-15T10:30:00Z')
    current: boolean;
    gpa?: string;
  }>;
  skills: string[];
  certifications?: Array<{
    name: string;
    issuer: string;
    issueDate?: string; // ISO 8601 date string (e.g., '2024-01-15' or '2024-01-15T10:30:00Z')
    expiryDate?: string; // ISO 8601 date string (e.g., '2024-01-15' or '2024-01-15T10:30:00Z')
  }>;
  languages?: Array<{
    language: string;
    proficiency: LanguageProficiency;
  }>;
  projects?: Array<{
    name: string;
    description: string;
    technologies: string[];
    url?: string;
  }>;
}

// =============================================================================
// Interview Questions (CandidateApplication.questionsData)
// =============================================================================

export type QuestionType = 'SHORT_ANSWER' | 'LONG_ANSWER' | 'MULTIPLE_CHOICE' | 'SCORED';
export type QuestionCategory = 'technical' | 'behavioral' | 'experience' | 'problem-solving';

export interface InterviewQuestions {
  metadata: {
    cvId: string;
    jobId: string;
    generatedAt: string; // ISO 8601 datetime string
    // Counts removed - derive from arrays using getQuestionCounts()
  };
  customQuestions: Array<{
    id: string;
    type: QuestionType;
    content: string;
    options?: Array<{ label: string }>;
    scoringConfig?: {
      type: string;
      min: number;
      max: number
    };
    required: boolean;
    order: number;
  }>;
  suggestedQuestions: Array<{
    content: string;
    reason: string;
    category?: QuestionCategory;
  }>;
}

/**
 * Helper function to get question counts from InterviewQuestions
 * Prevents data desynchronization by computing counts from arrays
 */
export function getQuestionCounts(questions: InterviewQuestions) {
  return {
    total: questions.customQuestions.length + questions.suggestedQuestions.length,
    custom: questions.customQuestions.length,
    suggested: questions.suggestedQuestions.length,
  };
}

// =============================================================================
// AI Evaluation (Interview.aiEvaluation)
// =============================================================================

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
// Type Guards for Runtime Validation
// =============================================================================

/**
 * PARTIAL validation - only checks core required fields
 * Does not validate: seniority, location, employmentType, workArrangement
 * Consider using Zod for comprehensive production validation
 */
export function isExtractedJobData(data: unknown): data is ExtractedJobData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.title === 'string' &&
    typeof d.company === 'string' &&
    Array.isArray(d.responsibilities) &&
    Array.isArray(d.requirements)
  );
}

/**
 * PARTIAL validation - only checks top-level structure
 * Does not validate: nested object shapes, array contents, optional fields
 * Consider using Zod for comprehensive production validation
 */
export function isExtractedCVData(data: unknown): data is ExtractedCVData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.personalInfo === 'object' &&
    d.personalInfo !== null &&
    Array.isArray(d.experience) &&
    Array.isArray(d.education) &&
    Array.isArray(d.skills)
  );
}

/**
 * PARTIAL validation - only checks top-level structure
 * Does not validate: metadata fields, question array contents
 * Consider using Zod for comprehensive production validation
 */
export function isInterviewQuestions(data: unknown): data is InterviewQuestions {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.metadata === 'object' &&
    d.metadata !== null &&
    Array.isArray(d.customQuestions) &&
    Array.isArray(d.suggestedQuestions)
  );
}

/**
 * PARTIAL validation - only checks basic types
 * Does not validate: score ranges (0-100), category structure, array contents
 * Consider using Zod for comprehensive production validation with constraints
 */
export function isAIEvaluation(data: unknown): data is AIEvaluation {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.overallScore === 'number' &&
    typeof d.categories === 'object' &&
    d.categories !== null &&
    Array.isArray(d.strengths) &&
    Array.isArray(d.improvements) &&
    typeof d.summary === 'string'
  );
}
