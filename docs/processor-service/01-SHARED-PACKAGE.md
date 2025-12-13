# Phase 1: Shared Package

## Goal
Create `packages/shared/` with types, Zod schemas, and utilities shared between `apps/web/` and `apps/processor/`.

> [!NOTE]
> **CV Types Preserved**: The CV-related types (`ExtractedCVData`, `CVResult`, CV Zod schemas) are intentionally kept in this package even though the CV pipeline is not yet implemented. This ensures minimal changes needed when CV processing is added in the future.

## Prerequisites
- None (first phase)

## Deliverables

### Directory Structure
```
packages/shared/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                    # Main exports
│   ├── types/
│   │   ├── index.ts
│   │   ├── extracted-data.ts       # ExtractedJobData, ExtractedCVData
│   │   ├── webhook-payloads.ts     # DocumentProcessedWebhook
│   │   └── enums.ts                # EmploymentType, WorkArrangement
│   ├── schemas/
│   │   ├── index.ts
│   │   ├── jd-schemas.ts           # Zod schemas for JD
│   │   ├── cv-schemas.ts           # Zod schemas for CV
│   │   └── webhook-schemas.ts      # Webhook validation
│   └── utils/
│       ├── index.ts
│       └── hash-utils.ts           # generateFileHash, generateStringHash
└── tsup.config.ts                  # Build config (optional)
```

---

## Tasks

### 1. Create package structure
```bash
mkdir -p packages/shared/src/{types,schemas,utils}
```

### 2. Create package.json
```json
{
  "name": "@sync-hire/shared",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./types": "./src/types/index.ts",
    "./schemas": "./src/schemas/index.ts",
    "./utils": "./src/utils/index.ts"
  },
  "scripts": {
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

### 3. Create tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "declaration": true,
    "declarationMap": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "./dist"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 4. Move types from apps/web/src/lib/mock-data.ts

**Source:** `apps/web/src/lib/mock-data.ts`

**Create:** `packages/shared/src/types/extracted-data.ts`
```typescript
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

export interface ExtractedCVData {
  personalInfo: {
    fullName: string;
    email: string;
    phone: string;
    location: string;
    summary: string;
    linkedinUrl?: string;
    githubUrl?: string;
    portfolioUrl?: string;
  };
  experience: Array<{
    title: string;
    company: string;
    location: string;
    startDate: string;
    endDate: string;
    current: boolean;
    description: string;
  }>;
  education: Array<{
    degree: string;
    field: string;
    institution: string;
    location: string;
    startDate: string;
    endDate: string;
    current: boolean;
    gpa?: string;
  }>;
  skills: string[];
  certifications: Array<{
    name: string;
    issuer: string;
    issueDate: string;
    expiryDate?: string;
    credentialId?: string;
  }>;
  languages: Array<{
    language: string;
    proficiency: "Basic" | "Intermediate" | "Advanced" | "Native";
  }>;
  projects: Array<{
    name: string;
    description: string;
    technologies: string[];
    url?: string;
    startDate?: string;
    endDate?: string;
  }>;
}
```

### 5. Create enums
**Create:** `packages/shared/src/types/enums.ts`
```typescript
export const EMPLOYMENT_TYPES = [
  "Full-time",
  "Part-time",
  "Contract",
  "Temporary",
  "Internship",
  "Not specified",
] as const;

export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const WORK_ARRANGEMENTS = [
  "Remote",
  "Hybrid",
  "On-site",
  "Flexible",
  "Not specified",
] as const;

export type WorkArrangement = (typeof WORK_ARRANGEMENTS)[number];
```

### 6. Create webhook payload types
**Create:** `packages/shared/src/types/webhook-payloads.ts`
```typescript
import type { ExtractedJobData, ExtractedCVData } from "./extracted-data";

export type ProcessingStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "needs_review";

export interface ProcessingStep {
  node: string;
  status: "completed" | "failed" | "skipped";
  durationMs: number;
  confidence?: number;
}

export interface ValidationResult {
  isValid: boolean;
  overallConfidence: number;
  fieldScores: Record<string, number>;
  issues: string[];
  warnings: string[];
}

export interface ProcessingError {
  code: string;
  message: string;
  retryable: boolean;
  nodeFailedAt?: string;
}

export interface JDResult {
  hash: string;
  extractedData: ExtractedJobData;
  aiSuggestions?: Array<{ original: string; improved: string }>;
  aiQuestions?: Array<{ content: string; reason: string }>;
}

export interface CVResult {
  hash: string;
  extractedData: ExtractedCVData;
}

export interface DocumentProcessedWebhook {
  processingId: string;
  correlationId?: string;
  type: "jd" | "cv";
  status: ProcessingStatus;
  processedAt: string;
  processingDurationMs: number;
  result?: JDResult | CVResult;
  validation?: ValidationResult;
  error?: ProcessingError;
  reviewReason?: string;
  processingSteps: ProcessingStep[];
}
```

### 6.5. Add Node Evaluation Types (Relevance Scoring)

**Create:** `packages/shared/src/types/node-evaluation.ts`

Node evaluation output - standardized format for monitoring each node's output with relevance scores:

```typescript
// Node evaluation output - every node returns this
export interface NodeEvaluationOutput<T = unknown> {
  nodeId: string;
  nodeName: string;
  data: T;
  evaluation: {
    relevanceScore: number;      // 0-1, from LLM self-assessment
    confidenceScore: number;     // 0-1, aggregated confidence
    groundingScore: number;      // 0-1, how grounded in source
    completenessScore: number;   // 0-1, all expected fields present
    issues: string[];            // Blocking issues
    warnings: string[];          // Non-blocking concerns
  };
  grounding: {
    sourceQuotes: string[];      // Exact quotes from source
    inferredFields: string[];    // Fields not in source but inferred
  };
  metrics: {
    executionTimeMs: number;
    tokenUsage: { input: number; output: number };
    llmModel: string;
    retryCount: number;
  };
  timestamp: string;
}

// User feedback on node output
export interface UserFeedback {
  processingId: string;
  nodeId: string;
  signal: "approve" | "edit" | "reject";
  corrections?: Record<string, unknown>;  // For "edit" signal
  reason?: string;                         // For "reject" signal
  userId: string;
  timestamp: string;
}

// Aggregated metrics per node for calibration
export interface NodeCalibration {
  nodeId: string;
  sampleCount: number;
  avgPredictedConfidence: number;
  avgActualAccuracy: number;      // Based on user feedback
  calibrationError: number;       // |predicted - actual|
  lastUpdated: string;
}

// Abstract storage interface for calibration (allows future DB migration)
export interface CalibrationStorageInterface {
  saveFeedback(feedback: UserFeedback): Promise<void>;
  getFeedback(processingId: string): Promise<UserFeedback[]>;
  getFeedbackByNode(nodeId: string, since?: Date): Promise<UserFeedback[]>;
  getCalibration(nodeId: string): Promise<NodeCalibration | null>;
  updateCalibration(nodeId: string, calibration: NodeCalibration): Promise<void>;
  getAllCalibrations(): Promise<NodeCalibration[]>;
  pruneOldFeedback(olderThan: Date): Promise<number>;
}
```

### 7. Create Zod schemas
**Create:** `packages/shared/src/schemas/jd-schemas.ts`
```typescript
import { z } from "zod";
import { EMPLOYMENT_TYPES, WORK_ARRANGEMENTS } from "../types/enums";

export const ExtractedJobDataSchema = z.object({
  title: z.string(),
  company: z.string(),
  responsibilities: z.array(z.string()),
  requirements: z.array(z.string()),
  seniority: z.string(),
  location: z.string(),
  employmentType: z.enum(EMPLOYMENT_TYPES),
  workArrangement: z.enum(WORK_ARRANGEMENTS),
});
```

**Create:** `packages/shared/src/schemas/cv-schemas.ts`
```typescript
import { z } from "zod";

export const ExtractedCVDataSchema = z.object({
  personalInfo: z.object({
    fullName: z.string(),
    email: z.string(),
    phone: z.string(),
    location: z.string(),
    summary: z.string(),
    linkedinUrl: z.string().optional(),
    githubUrl: z.string().optional(),
    portfolioUrl: z.string().optional(),
  }),
  experience: z.array(z.object({
    title: z.string(),
    company: z.string(),
    location: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    current: z.boolean(),
    description: z.string(),
  })),
  education: z.array(z.object({
    degree: z.string(),
    field: z.string(),
    institution: z.string(),
    location: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    current: z.boolean(),
    gpa: z.string().optional(),
  })),
  skills: z.array(z.string()),
  certifications: z.array(z.object({
    name: z.string(),
    issuer: z.string(),
    issueDate: z.string(),
    expiryDate: z.string().optional(),
    credentialId: z.string().optional(),
  })),
  languages: z.array(z.object({
    language: z.string(),
    proficiency: z.enum(["Basic", "Intermediate", "Advanced", "Native"]),
  })),
  projects: z.array(z.object({
    name: z.string(),
    description: z.string(),
    technologies: z.array(z.string()),
    url: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  })),
});
```

**Create:** `packages/shared/src/schemas/node-evaluation-schemas.ts`

```typescript
import { z } from "zod";

export const NodeEvaluationSchema = z.object({
  relevanceScore: z.number().min(0).max(1),
  confidenceScore: z.number().min(0).max(1),
  groundingScore: z.number().min(0).max(1),
  completenessScore: z.number().min(0).max(1),
  issues: z.array(z.string()),
  warnings: z.array(z.string()),
});

export const UserFeedbackSchema = z.object({
  processingId: z.string(),
  nodeId: z.string(),
  signal: z.enum(["approve", "edit", "reject"]),
  corrections: z.record(z.unknown()).optional(),
  reason: z.string().optional(),
  userId: z.string(),
  timestamp: z.string(),
});

export const NodeCalibrationSchema = z.object({
  nodeId: z.string(),
  sampleCount: z.number(),
  avgPredictedConfidence: z.number(),
  avgActualAccuracy: z.number(),
  calibrationError: z.number(),
  lastUpdated: z.string(),
});
```

### 8. Move hash-utils.ts
**Source:** `apps/web/src/lib/utils/hash-utils.ts`
**Target:** `packages/shared/src/utils/hash-utils.ts`

```typescript
import { createHash } from "crypto";

export function generateFileHash(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export function generateStringHash(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}
```

### 9. Create index exports
**Create:** `packages/shared/src/index.ts`
```typescript
// Types
export * from "./types/extracted-data";
export * from "./types/enums";
export * from "./types/webhook-payloads";
export * from "./types/node-evaluation";

// Schemas
export * from "./schemas/jd-schemas";
export * from "./schemas/cv-schemas";
export * from "./schemas/node-evaluation-schemas";

// Utils
export * from "./utils/hash-utils";
```

### 10. Update pnpm-workspace.yaml
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

### 11. Update apps/web to use shared package
**Modify:** `apps/web/package.json`
```json
{
  "dependencies": {
    "@sync-hire/shared": "workspace:*"
  }
}
```

**Update imports in apps/web:**
```typescript
// Before
import type { ExtractedJobData, ExtractedCVData } from "@/lib/mock-data";
import { generateFileHash } from "@/lib/utils/hash-utils";

// After
import type { ExtractedJobData, ExtractedCVData } from "@sync-hire/shared";
import { generateFileHash } from "@sync-hire/shared";
```

---

## Files to Modify in apps/web

| File | Change |
|------|--------|
| `apps/web/package.json` | Add @sync-hire/shared dependency |
| `apps/web/src/lib/mock-data.ts` | Remove type definitions, import from shared |
| `apps/web/src/lib/backend/jd-processor.ts` | Update imports |
| `apps/web/src/lib/backend/cv-processor.ts` | Update imports |
| `apps/web/src/lib/storage/storage-interface.ts` | Update imports |
| `apps/web/src/lib/utils/hash-utils.ts` | Can be removed (optional) |

---

## Verification
```bash
# Install dependencies
pnpm install

# Type check shared package
pnpm --filter @sync-hire/shared typecheck

# Type check web app (should still work)
pnpm --filter web typecheck
```

---

## Success Criteria
- [ ] `packages/shared/` exists with all files
- [ ] `pnpm install` succeeds
- [ ] Type checking passes in shared package
- [ ] Type checking passes in web app
- [ ] Web app runs without errors
- [ ] Node evaluation types are exported
- [ ] User feedback types are exported
- [ ] Calibration storage interface is exported
