/**
 * GET /api/candidate/interviews/:id
 *
 * Retrieves a single interview for the authenticated candidate.
 * Returns CandidateInterviewResponse format (limited data).
 * Access: Candidate only (must be the interview owner)
 */

import { logger } from "@/lib/logger";
import { getStorage } from "@/lib/storage/storage-factory";
import { getServerSession } from "@/lib/auth-server";
import { errors, successResponse } from "@/lib/api-response";
import type { CandidateInterviewResponse } from "@/lib/types/api-responses";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return errors.unauthorized();
    }

    const { id } = await params;
    const storage = getStorage();

    // Try to get interview directly
    let interview = await storage.getInterview(id);
    let job = interview ? await storage.getJob(interview.jobId) : null;

    // If not found as interview, try as application ID
    if (!interview) {
      const application = await storage.getApplication(id);
      if (application) {
        // Verify ownership
        if (application.userId !== session.user.id) {
          return errors.forbidden("You can only view your own interviews");
        }

        job = await storage.getJob(application.jobId);

        // Return application data as interview response
        if (job) {
          const candidateInterview: CandidateInterviewResponse = {
            id,
            jobId: application.jobId,
            jobTitle: job.title,
            companyName: job.organization.name,
            status: "PENDING",
            score: application.matchScore,
            aiEvaluation: null, // Applications don't have evaluations yet
            durationMinutes: 30,
            createdAt: application.createdAt,
            completedAt: null,
          };

          return successResponse({
            success: true,
            data: candidateInterview,
          });
        }
      }
    }

    if (!interview) {
      return errors.notFound("Interview");
    }

    // Verify ownership
    if (interview.candidateId !== session.user.id) {
      return errors.forbidden("You can only view your own interviews");
    }

    if (!job) {
      return errors.notFound("Job");
    }

    // Return candidate response (no transcript, but includes aiEvaluation for results page)
    const candidateInterview: CandidateInterviewResponse = {
      id: interview.id,
      jobId: interview.jobId,
      jobTitle: job.title,
      companyName: job.organization.name,
      status: interview.status,
      score: interview.score,
      aiEvaluation: interview.aiEvaluation ?? null,
      durationMinutes: interview.durationMinutes,
      createdAt: interview.createdAt,
      completedAt: interview.completedAt,
    };

    return successResponse({
      success: true,
      data: candidateInterview,
    });
  } catch (error) {
    logger.error(error, {
      api: "candidate/interviews/[id]",
      operation: "fetch",
    });
    return errors.internal("Failed to fetch interview");
  }
}
