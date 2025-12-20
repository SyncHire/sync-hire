/**
 * GET /api/org/[orgId]/quota
 *
 * Get an organization's AI usage quota and usage stats.
 * Requires authentication and organization membership.
 */

import { getUsage } from "@/lib/ai-usage-tracker";
import { errors, successResponse } from "@/lib/api-response";
import { withOrgMembership } from "@/lib/auth-middleware";
import { logger } from "@/lib/logger";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orgId: string }> },
) {
  let orgId: string;
  try {
    const resolvedParams = await params;
    orgId = resolvedParams.orgId;
  } catch {
    return errors.badRequest("Invalid request parameters");
  }

  if (!orgId) {
    return errors.badRequest("Missing orgId parameter");
  }

  // Verify org membership (with caching)
  const { response } = await withOrgMembership(orgId);
  if (response) {
    return response;
  }

  try {
    const usage = await getUsage(orgId);
    return successResponse({ data: usage });
  } catch (error) {
    logger.error(error, { api: "org/[orgId]/quota", operation: "get" });
    return errors.internal("Failed to get quota");
  }
}
