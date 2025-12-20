// src/stores/processing.store.ts
// In-memory store for processing jobs (MVP - can be replaced with Prisma later)

import type { ProcessingStatus } from "@sync-hire/shared";

interface ProcessingStep {
  name: string;
  status: "pending" | "processing" | "completed" | "failed" | "skipped";
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export interface ProcessingJob {
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

// Simple in-memory store
const jobs = new Map<string, ProcessingJob>();

export function createJob(
  id: string,
  type: "jd",
  webhookUrl: string,
  correlationId?: string
): ProcessingJob {
  const job: ProcessingJob = {
    id,
    type,
    status: "queued",
    webhookUrl,
    correlationId,
    createdAt: new Date(),
    processingSteps: [],
  };
  jobs.set(id, job);
  return job;
}

export function getJob(id: string): ProcessingJob | undefined {
  return jobs.get(id);
}

export function updateJobStatus(id: string, status: ProcessingStatus): void {
  const job = jobs.get(id);
  if (!job) return;

  job.status = status;
  if (status === "processing") {
    job.startedAt = new Date();
  }
  if (status === "completed" || status === "failed") {
    job.completedAt = new Date();
  }
}

export function updateJobProgress(
  id: string,
  currentNode: string,
  completedNodes: string[],
  totalNodes: number
): void {
  const job = jobs.get(id);
  if (!job) return;

  job.progress = { currentNode, completedNodes, totalNodes };
}

export function setJobResult(id: string, result: unknown): void {
  const job = jobs.get(id);
  if (!job) return;

  job.result = result;
}

export function setJobError(
  id: string,
  code: string,
  message: string,
  retryable: boolean
): void {
  const job = jobs.get(id);
  if (!job) return;

  job.error = { code, message, retryable };
}

// Cleanup old jobs (call periodically)
export function cleanupOldJobs(maxAgeMs: number = 24 * 60 * 60 * 1000): number {
  const cutoff = Date.now() - maxAgeMs;
  let count = 0;
  for (const [id, job] of jobs) {
    if (job.createdAt.getTime() < cutoff) {
      jobs.delete(id);
      count++;
    }
  }
  return count;
}
