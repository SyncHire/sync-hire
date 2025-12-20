/**
 * Server-only utility for fetching job applications for candidates
 */

import "server-only";
import { prisma } from "@sync-hire/database";
import { getAllActiveJobsData, type JobWithApplicantCount } from "./get-jobs";

/**
 * Candidate-facing job application type (uses database Job type)
 */
export interface CandidateJobApplication {
  id: string;
  job: JobWithApplicantCount;
  candidateId: string;
  matchPercentage: number;
  status: "NOT_APPLIED" | "APPLIED" | "INTERVIEWING" | "COMPLETED";
  interviewId?: string;
  appliedAt?: Date;
  createdAt: Date;
}

/**
 * Get all active jobs with candidate's application status.
 * Returns real application IDs for jobs the user has applied to.
 */
export async function getCandidateJobApplications(
  userId: string,
): Promise<CandidateJobApplication[]> {
  // Get all active jobs
  const jobs = await getAllActiveJobsData();

  // Get user's applications
  const userApplications = await prisma.candidateApplication.findMany({
    where: { userId },
    select: {
      id: true,
      jobId: true,
      matchScore: true,
      status: true,
      interviewId: true,
      createdAt: true,
    },
  });

  // Create a map of jobId -> application for quick lookup
  const applicationsByJobId = new Map(
    userApplications.map((app) => [app.jobId, app]),
  );

  return jobs.map((job) => {
    const application = applicationsByJobId.get(job.id);

    if (application) {
      // User has applied - return real application data
      return {
        id: application.id,
        job,
        candidateId: userId,
        matchPercentage: application.matchScore,
        status: mapApplicationStatus(application.status),
        interviewId: application.interviewId ?? undefined,
        appliedAt: application.createdAt,
        createdAt: application.createdAt,
      };
    }

    // User hasn't applied - return job info without application
    return {
      id: job.id, // Use job ID for non-applied jobs
      job,
      candidateId: userId,
      matchPercentage: 0, // Will be calculated when they apply
      status: "NOT_APPLIED" as const,
      createdAt: new Date(job.createdAt),
    };
  });
}

/**
 * Map database ApplicationStatus to UI status
 */
function mapApplicationStatus(
  dbStatus: string,
): "NOT_APPLIED" | "APPLIED" | "INTERVIEWING" | "COMPLETED" {
  switch (dbStatus) {
    case "COMPLETED":
      return "COMPLETED";
    case "INTERVIEWING":
      return "INTERVIEWING";
    default:
      return "APPLIED";
  }
}
