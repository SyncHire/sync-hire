/**
 * GET /api/jobs/[id]/applicants
 *
 * Returns all interviews/applicants for a specific job.
 * Combines interview data with user/CV data to provide applicant details.
 * Also includes AI-matched applications that haven't started interviews yet.
 *
 * Access: HR only (organization members)
 */

import { type NextRequest } from "next/server";
import { logger } from "@/lib/logger";
import { getStorage } from "@/lib/storage/storage-factory";
import { InterviewStatus } from "@sync-hire/database";
import { withJobAccess } from "@/lib/auth-middleware";
import { errors, successResponse } from "@/lib/api-response";

// Common applicant type for the response
interface ApplicantResponse {
  id: string;
  interviewId: string | null;
  candidateId: string;
  cvId: string | null;
  name: string;
  email: string;
  status: InterviewStatus | "PENDING" | "IN_PROGRESS" | "COMPLETED";
  score?: number;
  durationMinutes: number;
  createdAt: string;
  completedAt?: string | null;
  aiEvaluation?: unknown;
  skills: string[];
  experience: unknown[];
  source: "interview" | "ai_match";
  matchReasons?: string[];
  skillGaps?: string[];
}

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

    // Get the job (already verified to exist by withJobAccess)
    const job = await storage.getJob(jobId);
    if (!job) {
      return errors.notFound("Job");
    }

    // Get all interviews and filter by jobId
    const allInterviews = await storage.getAllInterviews();
    const jobInterviews = allInterviews.filter(
      (interview) => interview.jobId === jobId
    );

    // Get AI-matched applications for this job
    const aiApplications = await storage.getApplicationsForJob(jobId);

    // Track CVIds that have interviews already
    const interviewCvIds = new Set<string>();

    // Enrich interview data with user/CV information
    const interviewApplicants = await Promise.all(
      jobInterviews.map(async (interview) => {
        // Try to get user data
        const user = await storage.getUser(interview.candidateId);

        // Try to get CV data if user has one
        let cvData = null;
        let cvId: string | null = null;
        if (user) {
          cvId = await storage.getUserCVId(user.id);
          if (cvId) {
            cvData = await storage.getCVExtraction(cvId);
            interviewCvIds.add(cvId);
          }
        }

        return {
          id: interview.id,
          interviewId: interview.id,
          candidateId: interview.candidateId,
          cvId: cvId ?? null,
          name:
            cvData?.personalInfo?.fullName ?? user?.name ?? "Unknown Candidate",
          email: cvData?.personalInfo?.email ?? user?.email ?? "",
          status: interview.status,
          score: interview.score ?? undefined,
          durationMinutes: interview.durationMinutes,
          createdAt:
            interview.createdAt instanceof Date
              ? interview.createdAt.toISOString()
              : String(interview.createdAt),
          completedAt:
            interview.completedAt instanceof Date
              ? interview.completedAt.toISOString()
              : interview.completedAt
                ? String(interview.completedAt)
                : undefined,
          aiEvaluation: interview.aiEvaluation ?? undefined,
          skills: cvData?.skills ?? [],
          experience: cvData?.experience ?? [],
          source: "interview" as const,
        };
      })
    );

    // Convert AI applications to applicant format (only those without interviews)
    const aiApplicants = await Promise.all(
      aiApplications
        .filter((app) => !interviewCvIds.has(app.cvUploadId))
        .map(async (app) => {
          // Get CV data for skills
          const cvData = await storage.getCVExtraction(app.cvUploadId);

          return {
            id: app.id,
            interviewId: null,
            candidateId: app.cvUploadId,
            cvId: app.cvUploadId,
            name: app.candidateName,
            email: app.candidateEmail,
            status: "PENDING" as const,
            score: app.matchScore,
            durationMinutes: 0,
            createdAt:
              app.createdAt?.toISOString?.() ?? new Date().toISOString(),
            completedAt: undefined,
            aiEvaluation: undefined,
            skills: cvData?.skills ?? [],
            experience: cvData?.experience ?? [],
            source: "ai_match" as const,
            matchReasons: app.matchReasons,
            skillGaps: app.skillGaps,
          };
        })
    );

    // Combine interview applicants and AI-matched applicants
    const applicants: ApplicantResponse[] = [
      ...interviewApplicants,
      ...aiApplicants,
    ];

    // Sort by score (completed first, then by score descending)
    applicants.sort((a, b) => {
      if (a.status === "COMPLETED" && b.status !== "COMPLETED") {
        return -1;
      }
      if (a.status !== "COMPLETED" && b.status === "COMPLETED") {
        return 1;
      }
      return (b.score ?? 0) - (a.score ?? 0);
    });

    return successResponse({
      success: true,
      data: {
        job: {
          id: job.id,
          title: job.title,
          company: job.organization.name,
        },
        applicants,
        stats: {
          total: applicants.length,
          completed: applicants.filter((a) => a.status === "COMPLETED").length,
          pending: applicants.filter((a) => a.status === "PENDING").length,
          inProgress: applicants.filter((a) => a.status === "IN_PROGRESS")
            .length,
          averageScore:
            applicants.filter((a) => a.score !== undefined).length > 0
              ? Math.round(
                  applicants
                    .filter((a) => a.score !== undefined)
                    .reduce((sum, a) => sum + (a.score ?? 0), 0) /
                    applicants.filter((a) => a.score !== undefined).length
                )
              : null,
        },
      },
    });
  } catch (error) {
    logger.error(error, { api: "jobs/[id]/applicants", operation: "fetch" });
    return errors.internal("Failed to fetch applicants");
  }
}
