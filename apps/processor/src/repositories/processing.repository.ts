// src/repositories/processing.repository.ts
// Prisma-backed repository for processing jobs

import { prisma } from "@sync-hire/database";
import type { ProcessingStatus } from "@sync-hire/shared";
import { logger } from "../utils/logger.js";

interface ProcessingStep {
  name: string;
  status: "pending" | "processing" | "completed" | "failed" | "skipped";
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

interface ProcessingJobProgress {
  currentNode: string;
  completedNodes: string[];
  totalNodes: number;
}

interface ProcessingJobError {
  code: string;
  message: string;
  retryable: boolean;
}

export interface ProcessingJob {
  id: string;
  type: "jd";
  status: ProcessingStatus;
  webhookUrl: string;
  correlationId: string | null;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  progress: ProcessingJobProgress | null;
  result: unknown | null;
  error: ProcessingJobError | null;
  processingSteps: ProcessingStep[];
}

export async function createJob(
  id: string,
  type: "jd",
  webhookUrl: string,
  correlationId?: string
): Promise<ProcessingJob> {
  const job = await prisma.processingJob.create({
    data: {
      id,
      type,
      status: "queued",
      webhookUrl,
      correlationId: correlationId ?? null,
      processingSteps: [],
    },
  });
  
  logger.debug("ProcessingRepository: Job created", { id, type });
  
  return mapToProcessingJob(job);
}

export async function getJob(id: string): Promise<ProcessingJob | null> {
  const job = await prisma.processingJob.findUnique({ where: { id } });
  if (!job) return null;
  return mapToProcessingJob(job);
}

export async function updateJobStatus(
  id: string,
  status: ProcessingStatus
): Promise<void> {
  const updates: Record<string, unknown> = { status };
  
  if (status === "processing") {
    updates.startedAt = new Date();
  }
  if (status === "completed" || status === "failed" || status === "needs_review") {
    updates.completedAt = new Date();
  }
  
  await prisma.processingJob.update({ where: { id }, data: updates });
  logger.debug("ProcessingRepository: Status updated", { id, status });
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
  await prisma.processingJob.update({ where: { id }, data: { result: result as object } });
  logger.debug("ProcessingRepository: Result set", { id });
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
  logger.debug("ProcessingRepository: Error set", { id, code });
}

// Cleanup old jobs (run via cron or scheduled task)
export async function cleanupOldJobs(maxAgeMs: number = 24 * 60 * 60 * 1000): Promise<number> {
  const cutoff = new Date(Date.now() - maxAgeMs);
  const result = await prisma.processingJob.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  logger.info("ProcessingRepository: Cleaned up old jobs", { count: result.count });
  return result.count;
}

// Helper to map Prisma model to our interface
function mapToProcessingJob(job: {
  id: string;
  type: string;
  status: string;
  webhookUrl: string;
  correlationId: string | null;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  progress: unknown;
  result: unknown;
  error: unknown;
  processingSteps: unknown;
}): ProcessingJob {
  return {
    id: job.id,
    type: job.type as "jd",
    status: job.status as ProcessingStatus,
    webhookUrl: job.webhookUrl,
    correlationId: job.correlationId,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    progress: job.progress as ProcessingJobProgress | null,
    result: job.result,
    error: job.error as ProcessingJobError | null,
    processingSteps: (job.processingSteps as ProcessingStep[]) || [],
  };
}
