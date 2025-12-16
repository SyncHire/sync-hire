/**
 * Application Logger
 *
 * Centralized logging with Sentry integration.
 * Provides a swappable interface for error tracking and logging.
 *
 * @example
 * ```ts
 * import { logger } from "@/lib/logger";
 *
 * // API errors with context
 * logger.error(error, { api: "jobs/apply", operation: "create", jobId: "123" });
 *
 * // Warnings
 * logger.warn("Rate limit approaching", { api: "gemini", remaining: 10 });
 *
 * // Info logging
 * logger.info("Job created", { jobId: "123" });
 * ```
 */

import * as Sentry from "@sentry/nextjs";

interface LogContext {
  /** API route or module name */
  api?: string;
  /** Operation being performed */
  operation?: string;
  /** Additional context data */
  [key: string]: unknown;
}

interface Logger {
  /** Log an error to Sentry and console */
  error: (error: unknown, context?: LogContext) => void;
  /** Log a warning to Sentry and console */
  warn: (message: string, context?: LogContext) => void;
  /** Log info to console (not sent to Sentry) */
  info: (message: string, context?: LogContext) => void;
  /** Log debug info to console (not sent to Sentry) */
  debug: (message: string, context?: LogContext) => void;
}

function formatContext(context?: LogContext): string {
  if (!context) {
    return "";
  }
  const { api, operation, ...rest } = context;
  const prefix = api ? `[${api}]` : "";
  const op = operation ? ` ${operation}` : "";
  const extra = Object.keys(rest).length > 0 ? ` ${JSON.stringify(rest)}` : "";
  return `${prefix}${op}${extra}`;
}

function extractTags(context?: LogContext): Record<string, string> {
  const tags: Record<string, string> = {};
  if (context?.api) {
    tags.api = context.api;
  }
  if (context?.operation) {
    tags.operation = context.operation;
  }
  return tags;
}

function extractExtra(context?: LogContext): Record<string, unknown> {
  if (!context) {
    return {};
  }
  const { api, operation, ...extra } = context;
  return extra;
}

export const logger: Logger = {
  error(error: unknown, context?: LogContext): void {
    const tags = extractTags(context);
    const extra = extractExtra(context);

    Sentry.captureException(error, { tags, extra });

    const errorMessage = error instanceof Error ? error.message : String(error);
    const contextStr = formatContext(context);
    console.error(`${contextStr} Error:`, errorMessage);
  },

  warn(message: string, context?: LogContext): void {
    const tags = extractTags(context);
    const extra = extractExtra(context);

    Sentry.captureMessage(message, {
      level: "warning",
      tags,
      extra,
    });

    const contextStr = formatContext(context);
    console.warn(`${contextStr} ${message}`);
  },

  info(message: string, context?: LogContext): void {
    const contextStr = formatContext(context);
    console.info(`${contextStr} ${message}`);
  },

  debug(message: string, context?: LogContext): void {
    const contextStr = formatContext(context);
    console.debug(`${contextStr} ${message}`);
  },
};
