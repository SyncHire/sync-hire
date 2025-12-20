import { EmploymentType, WorkArrangement } from "./enums.js";
import type { ProcessingStatus, StepStatus } from "./enums.js";



// --- Node Evaluation Types ---

export interface NodeEvaluationOutput {
  relevanceScore: number; // 0.0 to 1.0
  confidenceScore: number; // 0.0 to 1.0
  groundingScore: number; // 0.0 to 1.0
  completenessScore: number; // 0.0 to 1.0
  issues?: string[];
  warnings?: string[];
}

export interface NodeGrounding {
  sourceQuotes: string[];
  inferredFields: string[];
}

export interface NodeExecutionMetrics {
  executionTimeMs: number;
  tokenUsage?: {
    input: number;
    output: number;
  };
  llmModel?: string;
  retryCount: number;
}

export type UserFeedbackSignal = "approve" | "edit" | "reject";

export interface UserFeedback {
  processingId: string;
  nodeId: string;
  signal: UserFeedbackSignal;
  corrections?: Record<string, unknown>;
  reason?: string;
  userId?: string;
  timestamp: string;
}

// --- Extraction Data Types ---

export interface ExtractedJobData {
  title: string;
  company: string;
  location?: string;
  salary?: {
    min?: number;
    max?: number;
    currency: string;
    period: "year" | "month" | "hour";
  };
  employmentType?: EmploymentType;
  workArrangement?: WorkArrangement;
  description: string;
  requirements: {
    skills: string[];
    experience?: string;
    education?: string;
  };
  benefits?: string[];
}

export interface ExtractedCVData {
  personalInfo: {
    name: string;
    email: string;
    phone?: string;
    linkedin?: string;
    website?: string;
    location?: string;
  };
  summary?: string;
  experience: Array<{
    title: string;
    company: string;
    location?: string;
    startDate: string; // ISO or YYYY-MM
    endDate?: string;  // ISO or YYYY-MM or "Present"
    description?: string;
    skills?: string[];
  }>;
  education: Array<{
    degree: string;
    institution: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
  }>;
  skills: {
    category?: string;
    items: string[];
  }[];
  languages?: Array<{
    language: string;
    proficiency?: string;
  }>;
  certifications?: Array<{
    name: string;
    issuer?: string;
    date?: string;
  }>;
  projects?: Array<{
    name: string;
    description?: string;
    link?: string;
    technologies?: string[];
  }>;
}

// --- Processing & Webhook Types ---

export interface ProcessingStep {
  name: string;
  status: StepStatus;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export interface WebhookPayload {
  processingId: string;
  correlationId?: string;
  type: "jd" | "cv";
  status: ProcessingStatus;
  processedAt: string;
  processingDurationMs: number;
  result?: {
    hash: string;
    extractedData: ExtractedJobData | ExtractedCVData;
    aiSuggestions?: Array<{ original: string; improved: string }>;
    aiQuestions?: Array<{ content: string; reason: string }>;
  };
  validation?: {
    isValid: boolean;
    overallConfidence: number;
    issues: string[];
    warnings: string[];
    fieldScores: Record<string, number>;
  };
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
  processingSteps: ProcessingStep[];
}

// Alias for specific webhook types
export type DocumentProcessedWebhook = WebhookPayload;

// --- Calibration Types ---

export interface NodeCalibration {
  nodeId: string;
  originalRelevanceScore: number;
  feedbackSignal: UserFeedbackSignal;
  timestamp: string;
  adjustedScore?: number; // Calculated after feedback
}

export interface CalibrationStorageInterface {
  saveFeedback(feedback: UserFeedback): Promise<void>;
  getFeedbackForNode(processingId: string, nodeId: string): Promise<UserFeedback[]>;
  saveCalibration(calibration: NodeCalibration): Promise<void>;
  getCalibrationStats(nodeName: string): Promise<any>; // TBD
}
