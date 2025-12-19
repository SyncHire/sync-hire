/**
 * GET /api/jobs/[id]/applications
 *
 * Get all candidate applications for a specific job.
 * Access: HR only (organization members)
 */

import { type NextRequest } from "next/server";
import { logger } from "@/lib/logger";
import { getStorage } from "@/lib/storage/storage-factory";
import { withJobAccess } from "@/lib/auth-middleware";
import { errors, successResponse } from "@/lib/api-response";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params;

    // Verify HR access (org member only)
    const { response } = await withJobAccess(jobId);
    if (response) {
      return response;
    }

    const storage = getStorage();

    // Get applications for this job (returns empty if job doesn't exist)
    const applications = await storage.getApplicationsForJob(jobId);

    return successResponse({
      success: true,
      data: {
        jobId,
        total: applications.length,
        applications: applications.map((app) => ({
          id: app.id,
          cvId: app.cvUploadId,
          candidateName: app.candidateName,
          candidateEmail: app.candidateEmail,
          matchScore: app.matchScore,
          matchReasons: app.matchReasons,
          skillGaps: app.skillGaps,
          status: app.status,
          source: app.source,
          createdAt: app.createdAt,
        })),
      },
    });
  } catch (error) {
    logger.error(error, { api: "jobs/[id]/applications", operation: "fetch" });
    return errors.internal("Failed to get applications");
  }
}
