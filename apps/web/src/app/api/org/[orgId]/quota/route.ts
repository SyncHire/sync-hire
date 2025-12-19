/**
 * GET /api/org/[orgId]/quota
 *
 * Get an organization's AI usage quota and usage stats.
 * Requires authentication and organization membership.
 */

import { prisma } from "@sync-hire/database";
import { getServerSession } from "@/lib/auth-server";
import { getUsage } from "@/lib/ai-usage-tracker";
import { errors, successResponse } from "@/lib/api-response";
import { logger } from "@/lib/logger";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  // Check authentication first
  const session = await getServerSession();
  if (!session) {
    return errors.unauthorized();
  }

  const userId = session.user.id;

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

  try {
    // Verify user is a member of this organization
    const membership = await prisma.member.findFirst({
      where: { userId, organizationId: orgId },
    });

    if (!membership) {
      return errors.forbidden("Not a member of this organization");
    }

    const usage = await getUsage(orgId);

    return successResponse({ data: usage });
  } catch (error) {
    logger.error(error, { api: "org/[orgId]/quota", operation: "get" });
    return errors.internal("Failed to get quota");
  }
}
