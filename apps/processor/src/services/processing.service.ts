// src/services/processing.service.ts
import { randomUUID } from "crypto";
import { generateFileHash } from "@sync-hire/shared";
import type { WebhookPayload, ExtractedJobData } from "@sync-hire/shared";
import { jdExtractionGraph, type JDExtractionStateType } from "../langgraph/index.js";
import * as processingRepo from "../repositories/processing.repository.js";
import { sendWebhook } from "./webhook.service.js";
import { logger } from "../utils/logger.js";
import fs from "fs";
import path from "path";
import os from "os";

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

  // Create job in store
  await processingRepo.createJob(
    processingId,
    request.type,
    request.webhookUrl,
    request.correlationId
  );

  // Process asynchronously
  processAsync(processingId, request, startTime).catch((error) => {
    logger.error("Async processing failed", { processingId, error: error instanceof Error ? error.message : String(error) });
  });

  return processingId;
}

async function processAsync(
  processingId: string,
  request: ProcessRequest,
  startTime: number
): Promise<void> {
  await processingRepo.updateJobStatus(processingId, "processing");

  // Write file to temp directory for LangGraph processing
  const tempDir = os.tmpdir();
  const tempFilePath = path.join(tempDir, `${processingId}-${request.fileName}`);
  
  try {
    // Write buffer to temp file
    await fs.promises.writeFile(tempFilePath, request.file);

    // Invoke the LangGraph pipeline
    const initialState: Partial<JDExtractionStateType> = {
      filePath: tempFilePath,
      fileType: request.mimeType,
      hints: {},
    };

    const threadId = processingId;

    const result = await jdExtractionGraph.invoke(initialState, {
      configurable: { thread_id: threadId },
    });

    const hash = generateFileHash(request.file);
    const processingDurationMs = Date.now() - startTime;

    // Determine final status based on validation
    const needsReview = result.validation && result.validation.overallConfidence < 0.7;
    const status = needsReview ? "needs_review" : "completed";
    
    await processingRepo.updateJobStatus(processingId, status);
    await processingRepo.setJobResult(processingId, result.jobData);

    const job = await processingRepo.getJob(processingId);

    const webhookPayload: WebhookPayload = {
      processingId,
      correlationId: request.correlationId,
      type: request.type,
      status,
      processedAt: new Date().toISOString(),
      processingDurationMs,
      result: {
        hash,
        extractedData: result.jobData as ExtractedJobData,
      },
      validation: {
        isValid: result.validation?.isValid ?? false,
        overallConfidence: result.validation?.overallConfidence ?? 0,
        fieldScores: {},
        issues: result.validation?.issues ?? [],
        warnings: result.validation?.warnings ?? [],
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

    const failurePayload: WebhookPayload = {
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
      processingSteps: (await processingRepo.getJob(processingId))?.processingSteps || [],
    };

    await sendWebhook(request.webhookUrl, failurePayload);

    logger.error("Document processing failed", { processingId, error: errorMessage });
  } finally {
    // Cleanup temp file
    try {
      await fs.promises.unlink(tempFilePath);
    } catch {
      // Ignore cleanup errors
    }
  }
}
