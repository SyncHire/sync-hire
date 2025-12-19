/**
 * GET /api/orgs/:id/interviews/:interviewId
 *
 * Retrieves a single interview with full HR details.
 * Returns HRInterviewResponse format.
 * Access: HR only (organization members)
 */

import { logger } from "@/lib/logger";
import { getStorage } from "@/lib/storage/storage-factory";
import { withOrgMembership } from "@/lib/auth-middleware";
import { errors, successResponse } from "@/lib/api-response";
import type { HRInterviewResponse } from "@/lib/types/api-responses";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; interviewId: string }> }
) {
  try {
    const { id: organizationId, interviewId } = await params;

    // Verify org membership
    const { response } = await withOrgMembership(organizationId);
    if (response) {
      return response;
    }

    const storage = getStorage();
    const interview = await storage.getInterview(interviewId);

    if (!interview) {
      return errors.notFound("Interview");
    }

    // Verify interview belongs to this org's jobs
    const job = await storage.getJob(interview.jobId);
    if (!job || job.organizationId !== organizationId) {
      return errors.forbidden("Interview does not belong to this organization");
    }

    // Get candidate info
    const user = await storage.getUser(interview.candidateId);

    const hrInterview: HRInterviewResponse = {
      id: interview.id,
      jobId: interview.jobId,
      jobTitle: job.title,
      candidateId: interview.candidateId,
      candidateName: user?.name ?? "Unknown Candidate",
      candidateEmail: user?.email ?? "",
      status: interview.status,
      callId: interview.callId,
      transcript: interview.transcript,
      score: interview.score,
      aiEvaluation: interview.aiEvaluation,
      durationMinutes: interview.durationMinutes,
      createdAt: interview.createdAt,
      completedAt: interview.completedAt,
    };

    return successResponse({
      success: true,
      data: hrInterview,
    });
  } catch (error) {
    logger.error(error, {
      api: "orgs/[id]/interviews/[interviewId]",
      operation: "fetch",
    });
    return errors.internal("Failed to fetch interview");
  }
}
