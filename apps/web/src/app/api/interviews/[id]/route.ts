/**
 * GET /api/interviews/[id]
 *
 * Retrieves a single interview with full details including AI evaluation.
 * Access: HR (org member) OR the interview candidate.
 */

import { errors, successResponse } from "@/lib/api-response";
import { withInterviewAccess } from "@/lib/auth-middleware";
import { logger } from "@/lib/logger";
import { getStorage } from "@/lib/storage/storage-factory";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Verify access - HR or candidate can view
    const { response } = await withInterviewAccess(id, {
      allowCandidate: true,
    });
    if (response) {
      return response;
    }

    const storage = getStorage();
    const interview = await storage.getInterview(id);

    if (!interview) {
      return errors.notFound("Interview");
    }

    // Get associated job details
    const job = await storage.getJob(interview.jobId);

    // Get candidate info if available
    const user = await storage.getUser(interview.candidateId);

    return successResponse({
      success: true,
      data: {
        interview,
        job: job
          ? {
              id: job.id,
              title: job.title,
              company: job.organization.name,
            }
          : null,
        candidate: user
          ? {
              id: user.id,
              name: user.name,
              email: user.email,
            }
          : null,
      },
    });
  } catch (error) {
    logger.error(error, { api: "interviews/[id]", operation: "fetch" });
    return errors.internal("Failed to fetch interview");
  }
}
