# Phase 4: API Endpoints

## Goal
Implement REST API endpoints for document processing with webhook callbacks.

## Prerequisites
- Phase 1-3 completed (Shared package, Skeleton, JD pipeline)

## Deliverables

### New/Modified Files
```
apps/processor/src/
├── routes/
│   └── documents.ts                # Document processing routes
├── controllers/
│   └── document.controller.ts      # Request handling logic
├── services/
│   ├── webhook.service.ts          # Webhook delivery with retry
│   └── processing.service.ts       # Orchestrates extraction
├── middleware/
│   └── upload.ts                   # Multer configuration
└── repositories/
    └── processing.repository.ts    # Prisma-backed job storage
```

---

## Tasks

### 1. Create upload middleware
```typescript
// src/middleware/upload.ts
import multer from "multer";
import { config } from "../config";

const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: config.maxFileSizeMb * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      "application/pdf",
      "text/plain",
      "text/markdown",
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  },
});
```

### 2. Create Prisma-backed processing repository
```typescript
// src/repositories/processing.repository.ts
import { prisma } from "@sync-hire/database";
import type { ProcessingStatus, ProcessingStep } from "@sync-hire/shared";

// Note: This assumes a ProcessingJob model is added to the Prisma schema.
// Alternatively, leverage the existing Job model with `jdExtraction` field.

interface ProcessingJob {
  id: string;
  type: "jd";
  status: ProcessingStatus;
  webhookUrl: string;
  correlationId?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  progress?: {
    currentNode: string;
    completedNodes: string[];
    totalNodes: number;
  };
  result?: unknown;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
  processingSteps: ProcessingStep[];
}

export async function createJob(
  id: string,
  type: "jd",
  webhookUrl: string,
  correlationId?: string
): Promise<ProcessingJob> {
  // Option 1: Use a dedicated ProcessingJob table (recommended)
  // Option 2: Store in Job.jdExtraction with status metadata
  
  const job = await prisma.processingJob.create({
    data: {
      id,
      type,
      status: "queued",
      webhookUrl,
      correlationId,
      processingSteps: [],
    },
  });
  return job as ProcessingJob;
}

export async function getJob(id: string): Promise<ProcessingJob | null> {
  const job = await prisma.processingJob.findUnique({ where: { id } });
  return job as ProcessingJob | null;
}

export async function updateJobStatus(
  id: string,
  status: ProcessingStatus
): Promise<void> {
  const updates: any = { status };
  if (status === "processing") {
    updates.startedAt = new Date();
  }
  if (status === "completed" || status === "failed") {
    updates.completedAt = new Date();
  }
  await prisma.processingJob.update({ where: { id }, data: updates });
}

export async function updateJobProgress(
  id: string,
  currentNode: string,
  completedNodes: string[],
  totalNodes: number
): Promise<void> {
  await prisma.processingJob.update({
    where: { id },
    data: { progress: { currentNode, completedNodes, totalNodes } },
  });
}

export async function setJobResult(id: string, result: unknown): Promise<void> {
  await prisma.processingJob.update({ where: { id }, data: { result } });
}

export async function setJobError(
  id: string,
  code: string,
  message: string,
  retryable: boolean
): Promise<void> {
  await prisma.processingJob.update({
    where: { id },
    data: { error: { code, message, retryable } },
  });
}

// Cleanup old jobs (run via cron or scheduled task)
export async function cleanupOldJobs(maxAgeMs: number = 24 * 60 * 60 * 1000): Promise<number> {
  const cutoff = new Date(Date.now() - maxAgeMs);
  const result = await prisma.processingJob.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  return result.count;
}
```

### 3. Create webhook service
```typescript
// src/services/webhook.service.ts
import { DocumentProcessedWebhook } from "@sync-hire/shared";
import { config } from "../config";
import { logger } from "../utils/logger";

interface WebhookResult {
  success: boolean;
  statusCode?: number;
  error?: string;
  attempts: number;
}

export async function sendWebhook(
  url: string,
  payload: DocumentProcessedWebhook
): Promise<WebhookResult> {
  const maxAttempts = config.webhookRetryAttempts;
  let lastError: string | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), config.webhookTimeoutMs);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.ok) {
        logger.info("Webhook delivered successfully", {
          url,
          processingId: payload.processingId,
          attempt,
        });
        return { success: true, statusCode: response.status, attempts: attempt };
      }

      lastError = `HTTP ${response.status}: ${response.statusText}`;
      logger.warn("Webhook delivery failed", {
        url,
        processingId: payload.processingId,
        attempt,
        statusCode: response.status,
      });

      // Don't retry on 4xx errors (client errors)
      if (response.status >= 400 && response.status < 500) {
        return {
          success: false,
          statusCode: response.status,
          error: lastError,
          attempts: attempt,
        };
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Unknown error";
      logger.error("Webhook delivery error", error, {
        url,
        processingId: payload.processingId,
        attempt,
      });
    }

    // Exponential backoff before retry
    if (attempt < maxAttempts) {
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return {
    success: false,
    error: lastError,
    attempts: maxAttempts,
  };
}
```

### 4. Create processing service
```typescript
// src/services/processing.service.ts
import { randomUUID } from "crypto";
import { generateFileHash, DocumentProcessedWebhook, ExtractedJobData } from "@sync-hire/shared";
import { extractJobDescription } from "../langgraph";
import * as processingRepo from "../repositories/processing.repository";
import { sendWebhook } from "./webhook.service";
import { logger } from "../utils/logger";

interface ProcessRequest {
  file: Buffer;
  fileName: string;
  mimeType: string;
  type: "jd";
  webhookUrl: string;
  correlationId?: string;
  config?: {
    disabledNodes?: string[];
    confidenceThreshold?: number;
  };
}

export async function processDocument(request: ProcessRequest): Promise<string> {
  const processingId = randomUUID();
  const startTime = Date.now();

  // Create job in PostgreSQL via Prisma
  await processingRepo.createJob(
    processingId,
    request.type,
    request.webhookUrl,
    request.correlationId
  );

  // Process asynchronously
  processAsync(processingId, request, startTime).catch((error) => {
    logger.error("Async processing failed", error, { processingId });
  });

  return processingId;
}

async function processAsync(
  processingId: string,
  request: ProcessRequest,
  startTime: number
): Promise<void> {
  await processingRepo.updateJobStatus(processingId, "processing");

  try {
    let result: {
      status: string;
      data: ExtractedJobData;
      validation: {
        isValid: boolean;
        overallConfidence: number;
        issues: string[];
        warnings: string[];
      };
    };

    result = await extractJobDescription(
      request.file,
      request.fileName,
      request.mimeType,
      request.config
    );

    const hash = generateFileHash(request.file);
    const processingDurationMs = Date.now() - startTime;

    const status = result.status === "needs_review" ? "needs_review" : "completed";
    await processingRepo.updateJobStatus(processingId, status);
    await processingRepo.setJobResult(processingId, result.data);

    const job = await processingRepo.getJob(processingId);

    const webhookPayload: DocumentProcessedWebhook = {
      processingId,
      correlationId: request.correlationId,
      type: request.type,
      status,
      processedAt: new Date().toISOString(),
      processingDurationMs,
      result: {
        hash,
        extractedData: result.data,
      },
      validation: {
        isValid: result.validation.isValid,
        overallConfidence: result.validation.overallConfidence,
        fieldScores: {},
        issues: result.validation.issues,
        warnings: result.validation.warnings,
      },
      processingSteps: job?.processingSteps || [],
    };

    await sendWebhook(request.webhookUrl, webhookPayload);

    logger.info("Document processing completed", {
      processingId,
      type: request.type,
      status,
      durationMs: processingDurationMs,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    await processingRepo.updateJobStatus(processingId, "failed");
    await processingRepo.setJobError(processingId, "EXTRACTION_FAILED", errorMessage, true);

    const failurePayload: DocumentProcessedWebhook = {
      processingId,
      correlationId: request.correlationId,
      type: request.type,
      status: "failed",
      processedAt: new Date().toISOString(),
      processingDurationMs: Date.now() - startTime,
      error: {
        code: "EXTRACTION_FAILED",
        message: errorMessage,
        retryable: true,
      },
      processingSteps: [],
    };

    await sendWebhook(request.webhookUrl, failurePayload);

    logger.error("Document processing failed", error, { processingId });
  }
}
```

interface ProcessRequest {
  file: Buffer;
  fileName: string;
  mimeType: string;
  type: "jd";  // Extensible: add "cv" when CV pipeline is implemented
  webhookUrl: string;
  correlationId?: string;
  config?: {
    disabledNodes?: string[];
    confidenceThreshold?: number;
  };
}

export async function processDocument(request: ProcessRequest): Promise<string> {
  const processingId = randomUUID();
  const startTime = Date.now();

  // Create job in store
  processingStore.create(
    processingId,
    request.type,
    request.webhookUrl,
    request.correlationId
  );

  // Process asynchronously
  processAsync(processingId, request, startTime).catch((error) => {
    logger.error("Async processing failed", error, { processingId });
  });

  return processingId;
}

async function processAsync(
  processingId: string,
  request: ProcessRequest,
  startTime: number
): Promise<void> {
  processingStore.updateStatus(processingId, "processing");

  try {
    let result: {
      status: string;
      data: ExtractedJobData;
      validation: {
        isValid: boolean;
        overallConfidence: number;
        issues: string[];
        warnings: string[];
      };
    };

    // Currently only JD extraction is supported
    // Future: Add CV extraction when CV pipeline is implemented
    result = await extractJobDescription(
      request.file,
      request.fileName,
      request.mimeType,
      request.config
    );

    const hash = generateFileHash(request.file);
    const processingDurationMs = Date.now() - startTime;

    // Determine final status
    const status = result.status === "needs_review" ? "needs_review" : "completed";
    processingStore.updateStatus(processingId, status);
    processingStore.setResult(processingId, result.data);

    // Build webhook payload
    const webhookPayload: DocumentProcessedWebhook = {
      processingId,
      correlationId: request.correlationId,
      type: request.type,
      status,
      processedAt: new Date().toISOString(),
      processingDurationMs,
      result: {
        hash,
        extractedData: result.data,
      },
      validation: {
        isValid: result.validation.isValid,
        overallConfidence: result.validation.overallConfidence,
        fieldScores: {},
        issues: result.validation.issues,
        warnings: result.validation.warnings,
      },
      processingSteps: processingStore.get(processingId)?.processingSteps || [],
    };

    // Send webhook
    await sendWebhook(request.webhookUrl, webhookPayload);

    logger.info("Document processing completed", {
      processingId,
      type: request.type,
      status,
      durationMs: processingDurationMs,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    processingStore.updateStatus(processingId, "failed");
    processingStore.setError(processingId, "EXTRACTION_FAILED", errorMessage, true);

    // Send failure webhook
    const failurePayload: DocumentProcessedWebhook = {
      processingId,
      correlationId: request.correlationId,
      type: request.type,
      status: "failed",
      processedAt: new Date().toISOString(),
      processingDurationMs: Date.now() - startTime,
      error: {
        code: "EXTRACTION_FAILED",
        message: errorMessage,
        retryable: true,
      },
      processingSteps: processingStore.get(processingId)?.processingSteps || [],
    };

    await sendWebhook(request.webhookUrl, failurePayload);

    logger.error("Document processing failed", error, { processingId });
  }
}
```

### 5. Create document controller
```typescript
import type { Request, Response } from "express";
import { z } from "zod";
import { processDocument } from "../services/processing.service";
import * as processingRepo from "../repositories/processing.repository";
import { logger } from "../utils/logger";

const ProcessRequestSchema = z.object({
  type: z.literal("jd"),  // Extensible: use z.enum(["jd", "cv"]) when CV is added
  webhookUrl: z.string().url(),
  correlationId: z.string().optional(),
  config: z.object({
    disabledNodes: z.array(z.string()).optional(),
    confidenceThreshold: z.number().min(0).max(1).optional(),
  }).optional(),
});

export async function processDocumentHandler(req: Request, res: Response) {
  try {
    // Validate file
    if (!req.file) {
      return res.status(400).json({
        error: { code: "MISSING_FILE", message: "No file uploaded" },
      });
    }

    // Parse and validate body
    const bodyResult = ProcessRequestSchema.safeParse(req.body);
    if (!bodyResult.success) {
      return res.status(400).json({
        error: {
          code: "INVALID_REQUEST",
          message: "Invalid request body",
          details: bodyResult.error.format(),
        },
      });
    }

    const { type, webhookUrl, correlationId, config } = bodyResult.data;

    // Future: Add CV-specific validation when CV pipeline is implemented
    // Currently only JD (PDF/TXT/MD) is supported

    // Start processing
    const processingId = await processDocument({
      file: req.file.buffer,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      type,
      webhookUrl,
      correlationId,
      config,
    });

    logger.info("Document processing started", {
      processingId,
      type,
      fileName: req.file.originalname,
      fileSize: req.file.size,
    });

    // Return 202 Accepted
    res.status(202).json({
      success: true,
      processingId,
      status: "processing",
      message: "Document processing started. Results will be sent to webhook.",
    });
  } catch (error) {
    logger.error("Process document handler error", error);
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to start processing",
      },
    });
  }
}

export async function getStatusHandler(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const job = await processingRepo.getJob(id);
    if (!job) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Processing job not found",
        },
      });
    }

    res.json({
      processingId: job.id,
      type: job.type,
      status: job.status,
      progress: job.progress,
      result: job.status === "completed" ? job.result : undefined,
      error: job.error,
      timestamps: {
        createdAt: job.createdAt.toISOString(),
        startedAt: job.startedAt?.toISOString(),
        completedAt: job.completedAt?.toISOString(),
      },
    });
  } catch (error) {
    logger.error("Get status handler error", error);
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to get status",
      },
    });
  }
}
```

### 6. Create documents route
```typescript
// src/routes/documents.ts
import { Router } from "express";
import { upload } from "../middleware/upload";
import { processDocumentHandler, getStatusHandler } from "../controllers/document.controller";

const router = Router();

// POST /api/documents/process
router.post(
  "/process",
  upload.single("file"),
  processDocumentHandler
);

// GET /api/documents/:id/status
router.get("/:id/status", getStatusHandler);

export default router;
```

### 7. Update routes/index.ts
```typescript
// src/routes/index.ts
import { Router } from "express";
import healthRouter from "./health";
import documentsRouter from "./documents";

const router = Router();

router.use(healthRouter);
router.use("/api/documents", documentsRouter);

export default router;
```

---

## API Specification

### POST /api/documents/process

**Request:**
```
Content-Type: multipart/form-data

file: <binary>
type: "jd" | "cv"
webhookUrl: "https://your-app.com/api/webhooks/document-processed"
correlationId: "optional-tracking-id" (optional)
config: {"disabledNodes": ["validator"], "confidenceThreshold": 0.8} (optional, JSON string)
```

**Response (202 Accepted):**
```json
{
  "success": true,
  "processingId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing",
  "message": "Document processing started. Results will be sent to webhook."
}
```

**Error Responses:**
- 400: Missing file or invalid request
- 413: File too large
- 415: Unsupported file type
- 500: Internal error

### GET /api/documents/:id/status

**Response (200 OK):**
```json
{
  "processingId": "550e8400-e29b-41d4-a716-446655440000",
  "type": "jd",
  "status": "completed",
  "progress": {
    "currentNode": "aggregator",
    "completedNodes": ["documentParser", "sectionDetector", "metadataExtractor"],
    "totalNodes": 7
  },
  "result": { ... },
  "timestamps": {
    "createdAt": "2024-01-15T10:30:00Z",
    "startedAt": "2024-01-15T10:30:01Z",
    "completedAt": "2024-01-15T10:30:15Z"
  }
}
```

---

## Node Evaluation Endpoints (Relevance Scoring & User Feedback)

### GET /api/documents/:id/nodes
Get all node evaluations with relevance scores.

**Response:**
```json
{
  "processingId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "nodes": [
    {
      "nodeId": "metadata_extractor",
      "nodeName": "MetadataExtractor",
      "data": { "title": "...", "company": "..." },
      "evaluation": {
        "relevanceScore": 0.92,
        "confidenceScore": 0.89,
        "groundingScore": 0.95,
        "completenessScore": 1.0,
        "issues": [],
        "warnings": []
      },
      "grounding": {
        "sourceQuotes": ["Senior Full-Stack Developer", "NexusTech Solutions"],
        "inferredFields": []
      },
      "metrics": {
        "executionTimeMs": 2341,
        "tokenUsage": { "input": 2000, "output": 500 },
        "llmModel": "gemini-2.5-flash",
        "retryCount": 0
      },
      "userFeedback": {
        "signal": "approve",
        "timestamp": "2025-01-15T10:35:00Z"
      }
    }
  ]
}
```

### POST /api/documents/:id/nodes/:nodeId/evaluate
Submit user feedback (approve/edit/reject) for a node.

**Request:**
```json
{
  "signal": "approve",                    // or "edit", "reject"
  "corrections": { "title": "..." },      // Only for "edit"
  "reason": "Title was ambiguous",        // Only for "reject"
  "userId": "user-123"
}
```

**Response:**
```json
{
  "success": true,
  "feedback": {
    "processingId": "550e8400...",
    "nodeId": "metadata_extractor",
    "signal": "approve",
    "timestamp": "2025-01-15T10:36:00Z"
  }
}
```

### GET /api/documents/:id/review-queue
Get nodes requiring review (low confidence or issues).

**Response:**
```json
{
  "processingId": "550e8400-e29b-41d4-a716-446655440000",
  "reviewRequired": true,
  "nodes": [
    {
      "nodeId": "skill_extractor",
      "nodeName": "SkillExtractor",
      "relevanceScore": 0.62,
      "issues": ["Low relevance score - extraction may be unreliable"],
      "warnings": ["Limited grounding evidence found"],
      "grounding": {
        "sourceQuotes": ["Python"],
        "inferredFields": ["JavaScript", "React", "Node.js"]
      }
    }
  ]
}
```

### Calibration Service (Abstract Storage)

The evaluation system includes automatic feedback calibration:

**`apps/processor/src/services/calibration.service.ts`:**

```typescript
export class CalibrationService {
  constructor(private storage: CalibrationStorageInterface) {}

  async recordFeedback(feedback: UserFeedback): Promise<void> {
    // Save feedback
    await this.storage.saveFeedback(feedback);

    // Update node calibration
    const existing = await this.storage.getCalibration(feedback.nodeId);
    const actualAccuracy = feedback.signal === "approve" ? 1 : 0;

    // ... update calibration metrics
  }

  async adjustConfidence(nodeId: string, rawConfidence: number): Promise<number> {
    const calibration = await this.storage.getCalibration(nodeId);

    if (!calibration || calibration.sampleCount < 10) {
      return rawConfidence; // Not enough data
    }

    // Adjust based on historical accuracy
    // If model predicts 0.9 but actual accuracy is 0.7, scale down
    const ratio = calibration.avgActualAccuracy / calibration.avgPredictedConfidence;
    return Math.min(1, Math.max(0, rawConfidence * ratio));
  }
}
```

---

## Testing

```bash
# Start processor service
pnpm --filter @sync-hire/processor dev

# Test health
curl http://localhost:3001/health

# Test JD processing (replace webhook URL)
curl -X POST http://localhost:3001/api/documents/process \
  -F "file=@./sample-jd.pdf" \
  -F "type=jd" \
  -F "webhookUrl=http://localhost:3000/api/webhooks/document-processed"

# Check status
curl http://localhost:3001/api/documents/{processingId}/status
```

---

## Success Criteria
- [ ] POST /api/documents/process accepts files
- [ ] Returns 202 with processingId
- [ ] GET /api/documents/:id/status returns job status
- [ ] Webhook is delivered on completion
- [ ] Webhook is delivered on failure
- [ ] Retry logic works for webhook delivery
- [ ] Disabled nodes config works
