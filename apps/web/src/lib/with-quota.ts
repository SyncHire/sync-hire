/**
 * Quota Enforcement Middleware
 *
 * Enforces organization-level AI usage quotas.
 * Pattern mirrors withRateLimit for consistency.
 *
 * Usage in route handlers:
 * ```
 * const quotaResponse = await withQuota(organizationId, "cv/extract");
 * if (quotaResponse) return quotaResponse;
 * // ... proceed with AI call ...
 * await trackUsage(organizationId, "cv/extract");
 * ```
 */

import {
  type AIEndpoint,
  checkQuota,
  getNextMonthStart,
  type UsageCheckResult,
} from "./ai-usage-tracker";
import { logger } from "./logger";

// =============================================================================
// Types
// =============================================================================

export interface QuotaCheckOptions {
  /** For dynamic endpoints, estimate the count before checking */
  estimatedCount?: number;
}

// =============================================================================
// Response Helpers
// =============================================================================

/**
 * Create quota exceeded response
 * Uses 402 Payment Required to indicate upgrade needed
 */
function createQuotaExceededResponse(
  result: UsageCheckResult,
  endpoint: AIEndpoint,
): Response {
  const resetDate = getNextMonthStart();

  logger.warn("Quota exceeded", {
    api: "quota",
    endpoint,
    tier: result.tier,
    currentUsage: result.currentUsage,
    limit: result.limit,
    periodKey: result.periodKey,
  });

  return new Response(
    JSON.stringify({
      success: false,
      error: "Monthly AI usage quota exceeded",
      code: "QUOTA_EXCEEDED",
      details: {
        tier: result.tier,
        currentUsage: result.currentUsage,
        limit: result.limit,
        periodKey: result.periodKey,
        resetDate: resetDate.toISOString(),
      },
    }),
    {
      status: 402, // Payment Required - indicates upgrade needed
      headers: {
        "Content-Type": "application/json",
        "X-Quota-Limit": String(result.limit ?? "unlimited"),
        "X-Quota-Remaining": String(result.remaining ?? "unlimited"),
        "X-Quota-Reset": resetDate.toISOString(),
      },
    },
  );
}

/**
 * Add quota headers to successful responses
 * Call this to add visibility headers without blocking
 */
export function addQuotaHeaders(
  headers: Headers,
  result: UsageCheckResult,
): void {
  const resetDate = getNextMonthStart();

  headers.set("X-Quota-Limit", String(result.limit ?? "unlimited"));
  headers.set("X-Quota-Remaining", String(result.remaining ?? "unlimited"));
  headers.set("X-Quota-Reset", resetDate.toISOString());

  if (result.warningThreshold) {
    headers.set("X-Quota-Warning", "true");
  }
}

// =============================================================================
// Main Middleware
// =============================================================================

/**
 * Check quota and return 402 response if exceeded
 * Returns null if quota is available (proceed with request)
 *
 * Fails open: if quota check fails due to infrastructure issues,
 * allows the request through with a warning log.
 *
 * @param organizationId - The organization to check quota for
 * @param endpoint - The AI endpoint being called
 * @param options - Optional configuration
 * @returns Response if quota exceeded, null if allowed
 */
export async function withQuota(
  organizationId: string,
  endpoint: AIEndpoint,
  options?: QuotaCheckOptions,
): Promise<Response | null> {
  let result;
  try {
    result = await checkQuota(organizationId);
  } catch (error) {
    // Fail open: allow request through if quota check fails
    logger.error(error, {
      api: "quota",
      operation: "check-quota",
      organizationId,
      endpoint,
      note: "Quota check failed, allowing request (fail-open)",
    });
    return null;
  }

  // Check if quota allows this request
  if (!result.allowed) {
    return createQuotaExceededResponse(result, endpoint);
  }

  // For dynamic endpoints with estimated count, check if we have enough remaining
  if (options?.estimatedCount && result.remaining !== null) {
    if (options.estimatedCount > result.remaining) {
      // Not enough quota for estimated operation
      logger.warn("Insufficient quota for estimated operation", {
        api: "quota",
        endpoint,
        estimatedCount: options.estimatedCount,
        remaining: result.remaining,
      });
      return createQuotaExceededResponse(result, endpoint);
    }
  }

  // Log warning if approaching limit
  if (result.warningThreshold) {
    logger.warn("Organization approaching quota limit", {
      api: "quota",
      endpoint,
      tier: result.tier,
      currentUsage: result.currentUsage,
      limit: result.limit,
      remaining: result.remaining,
      periodKey: result.periodKey,
    });
  }

  return null;
}

/**
 * Check quota without blocking (for read-only visibility)
 * Returns the quota status without returning a 402 response
 */
export async function getQuotaStatus(
  organizationId: string,
): Promise<UsageCheckResult> {
  return checkQuota(organizationId);
}
