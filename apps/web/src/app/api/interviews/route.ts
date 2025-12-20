/**
 * GET /api/interviews
 *
 * Retrieves interviews from storage with proper authorization.
 * - Candidates: Can only view their own interviews (userId must match session)
 * - HR: Can view all interviews for their active organization's jobs
 */

import type { NextRequest } from "next/server";
import { errors, successResponse } from "@/lib/api-response";
import { getActiveOrganizationId, getServerSession } from "@/lib/auth-server";
import { logger } from "@/lib/logger";
import { getStorage } from "@/lib/storage/storage-factory";

export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const session = await getServerSession();
    if (!session) {
      return errors.unauthorized();
    }

    const userId = session.user.id;
    const storage = getStorage();
    const { searchParams } = new URL(request.url);
    const requestedUserId = searchParams.get("userId");

    // If userId param is provided, ensure it matches the authenticated user
    // (users can only view their own interviews via userId param)
    if (requestedUserId) {
      if (requestedUserId !== userId) {
        return errors.forbidden("Cannot view other users' interviews");
      }
      const interviews = await storage.getInterviewsForUser(userId);
      return successResponse({
        success: true,
        data: interviews,
      });
    }

    // No userId param - HR view: require active organization
    const activeOrgId = await getActiveOrganizationId();
    if (!activeOrgId) {
      return errors.badRequest("No active organization selected");
    }

    // Get all interviews and filter by organization's jobs
    const allInterviews = await storage.getAllInterviews();
    const allJobs = await storage.getAllStoredJobs();
    const orgJobIds = new Set(
      allJobs
        .filter((job) => job.organizationId === activeOrgId)
        .map((job) => job.id),
    );

    const orgInterviews = allInterviews.filter((interview) =>
      orgJobIds.has(interview.jobId),
    );

    return successResponse({
      success: true,
      data: orgInterviews,
    });
  } catch (error) {
    logger.error(error, { api: "interviews", operation: "fetch" });
    return errors.internal("Failed to fetch interviews");
  }
}
