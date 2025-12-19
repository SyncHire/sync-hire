/**
 * GET /api/orgs/:id/jobs/:jobId/applications
 *
 * Get all candidate applications for a specific job.
 * Returns HRApplicationResponse format with full match data.
 * Access: HR only (organization members)
 */

import { type NextRequest } from "next/server";
import { logger } from "@/lib/logger";
import { getStorage } from "@/lib/storage/storage-factory";
import { withOrgMembership } from "@/lib/auth-middleware";
import { errors, successResponse } from "@/lib/api-response";
import type { HRApplicationResponse } from "@/lib/types/api-responses";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; jobId: string }> }
) {
  try {
    const { id: organizationId, jobId } = await params;

    // Verify org membership
    const { response } = await withOrgMembership(organizationId);
    if (response) {
      return response;
    }

    const storage = getStorage();

    // Get the job and verify it belongs to this org
    const job = await storage.getJob(jobId);
    if (!job) {
      return errors.notFound("Job");
    }
    if (job.organizationId !== organizationId) {
      return errors.forbidden("Job does not belong to this organization");
    }

    // Get applications for this job
    const applications = await storage.getApplicationsForJob(jobId);

    // Map to HR response format
    const hrApplications: HRApplicationResponse[] = applications.map((app) => ({
      id: app.id,
      jobId: app.jobId,
      candidateId: app.userId ?? app.cvUploadId,
      candidateName: app.candidateName,
      candidateEmail: app.candidateEmail,
      matchScore: app.matchScore,
      matchReasons: app.matchReasons,
      skillGaps: app.skillGaps,
      status: app.status,
      cvUploadId: app.cvUploadId,
      interviewId: app.interviewId,
      createdAt: app.createdAt,
    }));

    return successResponse({
      success: true,
      data: {
        jobId,
        total: hrApplications.length,
        applications: hrApplications,
      },
    });
  } catch (error) {
    logger.error(error, {
      api: "orgs/[id]/jobs/[jobId]/applications",
      operation: "fetch",
    });
    return errors.internal("Failed to get applications");
  }
}
