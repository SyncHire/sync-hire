/**
 * GET /api/orgs/:id/interviews
 *
 * Retrieves all interviews for an organization's jobs.
 * Returns HRInterviewResponse format with full data.
 * Access: HR only (organization members)
 */

import type { NextRequest } from "next/server";
import { errors, successResponse } from "@/lib/api-response";
import { withOrgMembership } from "@/lib/auth-middleware";
import { logger } from "@/lib/logger";
import { getStorage } from "@/lib/storage/storage-factory";
import type { HRInterviewResponse } from "@/lib/types/api-responses";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: organizationId } = await params;

    // Verify org membership (with caching)
    const { response } = await withOrgMembership(organizationId);
    if (response) {
      return response;
    }

    const storage = getStorage();

    // Get all jobs for this org
    const allJobs = await storage.getAllStoredJobs();
    const orgJobs = allJobs.filter(
      (job) => job.organizationId === organizationId,
    );
    const orgJobIds = new Set(orgJobs.map((job) => job.id));
    const jobMap = new Map(orgJobs.map((job) => [job.id, job]));

    // Get all interviews and filter by org's jobs
    const allInterviews = await storage.getAllInterviews();
    const orgInterviews = allInterviews.filter((interview) =>
      orgJobIds.has(interview.jobId),
    );

    // Build HR response format with enriched data
    const hrInterviews: HRInterviewResponse[] = await Promise.all(
      orgInterviews.map(async (interview) => {
        const job = jobMap.get(interview.jobId);
        const user = await storage.getUser(interview.candidateId);

        return {
          id: interview.id,
          jobId: interview.jobId,
          jobTitle: job?.title ?? "Unknown Job",
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
      }),
    );

    return successResponse({
      success: true,
      data: hrInterviews,
    });
  } catch (error) {
    logger.error(error, { api: "orgs/[id]/interviews", operation: "fetch" });
    return errors.internal("Failed to fetch interviews");
  }
}
