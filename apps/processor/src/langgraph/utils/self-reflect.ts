import { logger } from "../../utils/logger.js";
import type { NodeEvaluationOutput } from "@sync-hire/shared";

interface ResultWithEvaluation {
  evaluation: NodeEvaluationOutput;
}

/**
 * Retry utility for extractor functions based on relevance score.
 * 
 * @param extractFn - Async function that performs the extraction
 * @param maxRetries - Maximum number of retries (default: 2)
 * @param minScore - Minimum relevance score to accept (default: 0.7)
 * @returns The result of the extraction
 */
export async function withRetry<T extends ResultWithEvaluation>(
  extractFn: () => Promise<T>,
  nodeName: string,
  maxRetries = 2,
  minScore = 0.7
): Promise<T> {
  let lastResult: T | null = null;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      if (attempt > 1) {
        logger.warn(`${nodeName}: Retry attempt ${attempt}/${maxRetries + 1}`);
      }

      const result = await extractFn();
      lastResult = result;

      // Check relevance score
      const score = result.evaluation.relevanceScore;
      if (score >= minScore) {
        if (attempt > 1) {
          logger.info(`${nodeName}: Retry successful with score ${score}`);
        }
        return result;
      }

      logger.warn(`${nodeName}: Low relevance score (${score}) on attempt ${attempt}`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      logger.error(`${nodeName}: Attempt ${attempt} failed`, { error: lastError.message });
    }
  }

  // If we get here, all attempts failed or low confidence
  if (lastResult) {
    logger.warn(`${nodeName}: Returning best available result despite low confidence`);
    return lastResult;
  }

  throw lastError || new Error(`${nodeName}: All retry attempts failed`);
}
