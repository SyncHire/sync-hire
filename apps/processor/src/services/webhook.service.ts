// src/services/webhook.service.ts
import type { WebhookPayload } from "@sync-hire/shared";
import { config } from "../config.js";
import { logger } from "../utils/logger.js";

interface WebhookResult {
  success: boolean;
  statusCode?: number;
  error?: string;
  attempts: number;
}

export async function sendWebhook(
  url: string,
  payload: WebhookPayload
): Promise<WebhookResult> {
  const maxAttempts = config.WEBHOOK_RETRY_ATTEMPTS;
  let lastError: string | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), config.WEBHOOK_TIMEOUT_MS);

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
      logger.error("Webhook delivery error", {
        url,
        processingId: payload.processingId,
        attempt,
        error: lastError,
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
