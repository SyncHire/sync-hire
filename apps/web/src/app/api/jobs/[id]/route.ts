/**
 * Job API endpoints
 * GET - Get single job by ID (public for candidates)
 * PUT - Update job settings (aiMatchingEnabled, etc.) - requires HR access
 */

import { type NextRequest } from "next/server";
import { logger } from "@/lib/logger";
import { MatchingStatus } from "@sync-hire/database";
import { getStorage } from "@/lib/storage/storage-factory";
import { withJobAccess } from "@/lib/auth-middleware";
import { errors, successResponse } from "@/lib/api-response";

/**
 * GET /api/jobs/[id]
 * Public endpoint for viewing job details (candidates need this)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params;
    const storage = getStorage();

    const job = await storage.getJob(jobId);
    if (!job) {
      return errors.notFound("Job");
    }

    // Compute accurate applicant count from interviews
    const allInterviews = await storage.getAllInterviews();
    const jobInterviews = allInterviews.filter((i) => i.jobId === jobId);
    const jobWithCount = {
      ...job,
      applicantsCount: jobInterviews.length,
    };

    return successResponse({ success: true, data: jobWithCount });
  } catch (error) {
    logger.error(error, { api: "jobs/[id]", operation: "get" });
    return errors.internal("Failed to get job");
  }
}

/**
 * PUT /api/jobs/[id]
 * Update job settings - requires HR access (organization member)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params;

    // Verify HR access (org member only)
    const { response } = await withJobAccess(jobId);
    if (response) {
      return response;
    }

    const body = await request.json();
    const storage = getStorage();

    // Get existing job (already verified to exist by withJobAccess)
    const job = await storage.getJob(jobId);
    if (!job) {
      return errors.notFound("Job");
    }

    // Update job with new settings
    const updatedJob = {
      ...job,
      ...(body.aiMatchingEnabled !== undefined && {
        aiMatchingEnabled: body.aiMatchingEnabled,
      }),
      ...(body.aiMatchingThreshold !== undefined && {
        aiMatchingThreshold: body.aiMatchingThreshold,
      }),
    };

    // If AI matching is being disabled, update status to DISABLED (stops scanning)
    if (body.aiMatchingEnabled === false) {
      updatedJob.aiMatchingStatus = MatchingStatus.DISABLED;
    }

    // Save updated job
    await storage.saveJob(jobId, updatedJob);

    return successResponse({
      success: true,
      data: {
        id: jobId,
        aiMatchingEnabled: updatedJob.aiMatchingEnabled,
        aiMatchingThreshold: updatedJob.aiMatchingThreshold,
        aiMatchingStatus: updatedJob.aiMatchingStatus,
      },
    });
  } catch (error) {
    logger.error(error, { api: "jobs/[id]", operation: "update" });
    return errors.internal("Failed to update job");
  }
}
