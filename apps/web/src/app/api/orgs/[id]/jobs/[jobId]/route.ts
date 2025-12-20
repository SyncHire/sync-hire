/**
 * GET /api/orgs/:id/jobs/:jobId
 *
 * Retrieves full job details for HR users.
 * Requires authentication and organization membership.
 * Returns all fields including internal data (AI matching, JD extraction, etc.)
 */

import { type NextRequest } from "next/server";
import { logger } from "@/lib/logger";
import { getStorage } from "@/lib/storage/storage-factory";
import { withOrgMembership } from "@/lib/auth-middleware";
import { errors, successResponse } from "@/lib/api-response";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; jobId: string }> }
) {
  try {
    const { id: organizationId, jobId } = await params;

    // Verify org membership (with caching)
    const { response } = await withOrgMembership(organizationId);
    if (response) {
      return response;
    }

    const storage = getStorage();
    const job = await storage.getJob(jobId);

    if (!job) {
      return errors.notFound("Job");
    }

    // Verify job belongs to this organization
    if (job.organizationId !== organizationId) {
      return errors.notFound("Job");
    }

    // Compute accurate applicant count from interviews
    const allInterviews = await storage.getAllInterviews();
    const jobInterviews = allInterviews.filter((i) => i.jobId === jobId);
    const jobWithCount = {
      ...job,
      applicantsCount: jobInterviews.length,
    };

    return successResponse({
      success: true,
      data: jobWithCount,
    });
  } catch (error) {
    logger.error(error, { api: "orgs/jobs/[jobId]", operation: "get" });
    return errors.internal("Failed to fetch job");
  }
}
