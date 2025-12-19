/**
 * GET /api/orgs/:id/jobs
 *
 * Retrieves jobs for a specific organization.
 * Requires authentication and organization membership.
 */

import { type NextRequest } from "next/server";
import { logger } from "@/lib/logger";
import { getAllJobsData } from "@/lib/server-utils/get-jobs";
import { withOrgMembership } from "@/lib/auth-middleware";
import { errors, successResponse } from "@/lib/api-response";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: organizationId } = await params;

    // Verify org membership (with caching)
    const { response } = await withOrgMembership(organizationId);
    if (response) {
      return response;
    }

    const jobs = await getAllJobsData(organizationId);
    return successResponse({
      success: true,
      data: jobs,
    });
  } catch (error) {
    logger.error(error, { api: "orgs/jobs", operation: "fetch" });
    return errors.internal("Failed to fetch jobs");
  }
}
