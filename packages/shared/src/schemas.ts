import { z } from "zod";
import { EmploymentType, WorkArrangement } from "./enums.js";


// --- Enums ---

export const EmploymentTypeSchema = z.nativeEnum(EmploymentType);
export const WorkArrangementSchema = z.nativeEnum(WorkArrangement);

// --- Node Evaluation Schemas ---

export const NodeEvaluationOutputSchema = z.object({
  relevanceScore: z.number().min(0).max(1),
  confidenceScore: z.number().min(0).max(1),
  groundingScore: z.number().min(0).max(1),
  completenessScore: z.number().min(0).max(1),
  issues: z.array(z.string()).optional(),
  warnings: z.array(z.string()).optional(),
});

export const NodeGroundingSchema = z.object({
  sourceQuotes: z.array(z.string()),
  inferredFields: z.array(z.string()),
});

export const UserFeedbackSchema = z.object({
  processingId: z.string(),
  nodeId: z.string(),
  signal: z.enum(["approve", "edit", "reject"]),
  corrections: z.record(z.unknown()).optional(),
  reason: z.string().optional(),
  userId: z.string().optional(),
  timestamp: z.string(),
});

// --- Extraction Schemas ---

export const ExtractedJobDataSchema = z.object({
  title: z.string(),
  company: z.string(),
  location: z.string().optional(),
  salary: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    currency: z.string(),
    period: z.enum(["year", "month", "hour"]),
  }).optional(),
  employmentType: EmploymentTypeSchema.optional(),
  workArrangement: WorkArrangementSchema.optional(),
  description: z.string(),
  requirements: z.object({
    skills: z.array(z.string()),
    experience: z.string().optional(),
    education: z.string().optional(),
  }),
  benefits: z.array(z.string()).optional(),
});

export const ExtractedCVDataSchema = z.object({
  personalInfo: z.object({
    name: z.string(),
    email: z.string().email(),
    phone: z.string().optional(),
    linkedin: z.string().url().optional(),
    website: z.string().url().optional(),
    location: z.string().optional(),
  }),
  summary: z.string().optional(),
  experience: z.array(z.object({
    title: z.string(),
    company: z.string(),
    location: z.string().optional(),
    startDate: z.string(),
    endDate: z.string().optional(),
    description: z.string().optional(),
    skills: z.array(z.string()).optional(),
  })),
  education: z.array(z.object({
    degree: z.string(),
    institution: z.string(),
    location: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    description: z.string().optional(),
  })),
  skills: z.array(z.object({
    category: z.string().optional(),
    items: z.array(z.string()),
  })),
  languages: z.array(z.object({
    language: z.string(),
    proficiency: z.string().optional(),
  })).optional(),
  certifications: z.array(z.object({
    name: z.string(),
    issuer: z.string().optional(),
    date: z.string().optional(),
  })).optional(),
  projects: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    link: z.string().url().optional(),
    technologies: z.array(z.string()).optional(),
  })).optional(),
});

// --- Webhook Schemas ---

export const WebhookPayloadSchema = z.object({
  processingId: z.string().uuid(),
  correlationId: z.string().optional(),
  type: z.enum(["jd", "cv"]),
  status: z.enum(["queued", "processing", "completed", "failed", "needs_review"]),
  processedAt: z.string(),
  processingDurationMs: z.number(),
  result: z.object({
    hash: z.string(),
    extractedData: z.union([ExtractedJobDataSchema, ExtractedCVDataSchema]),
    aiSuggestions: z.array(z.object({ original: z.string(), improved: z.string() })).optional(),
    aiQuestions: z.array(z.object({ content: z.string(), reason: z.string() })).optional(),
  }).optional(),
  validation: z.object({
    isValid: z.boolean(),
    overallConfidence: z.number(),
    issues: z.array(z.string()),
    warnings: z.array(z.string()),
    fieldScores: z.record(z.number()),
  }).optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    retryable: z.boolean(),
  }).optional(),
  processingSteps: z.array(z.object({
    name: z.string(),
    status: z.enum(["pending", "processing", "completed", "failed", "skipped"]),
    startedAt: z.string().optional(),
    completedAt: z.string().optional(),
    error: z.string().optional(),
  })),
});
