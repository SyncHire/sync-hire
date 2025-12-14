/**
 * GET /api/jobs/[id]/applicants
 *
 * Returns all interviews/applicants for a specific job
 * Combines interview data with user/CV data to provide applicant details
 * Also includes AI-matched applications that haven't started interviews yet
 * Falls back to demo applicants only for demo jobs (job-1, job-2, job-3)
 */

import { NextRequest, NextResponse } from "next/server";
import { getDemoApplicants } from "@/lib/mock-data";
import { getStorage } from "@/lib/storage/storage-factory";

// Common applicant type for the response
interface ApplicantResponse {
  id: string;
  interviewId: string | null;
  candidateId: string;
  cvId: string | null;
  name: string;
  email: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  score?: number;
  durationMinutes: number;
  createdAt: string;
  completedAt?: string | null;
  aiEvaluation?: unknown;
  skills: string[];
  experience: unknown[];
  source: "interview" | "ai_match" | "demo";
  matchReasons?: string[];
  skillGaps?: string[];
  questionsHash?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: jobId } = await params;
    const storage = getStorage();

    // Get the job to verify it exists
    const job = await storage.getJob(jobId);
    if (!job) {
      return NextResponse.json(
        { success: false, message: "Job not found" },
        { status: 404 },
      );
    }

    // Check if this is a demo job (legacy hardcoded jobs)
    const isDemoJob = ["job-1", "job-2", "job-3"].includes(jobId);

    // Get all interviews and filter by jobId
    const allInterviews = await storage.getAllInterviews();
    const jobInterviews = allInterviews.filter(
      (interview) => interview.jobId === jobId,
    );

    // Get AI-matched applications for this job
    const aiApplications = await storage.getApplicationsForJob(jobId);

    // Track CVIds that have interviews already
    const interviewCvIds = new Set<string>();

    // Track if we're using demo data
    let usingDemoData = false;

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
          cvId: cvId,
          name: cvData?.personalInfo?.fullName ?? user?.name ?? "Unknown Candidate",
          email: cvData?.personalInfo?.email ?? user?.email ?? "",
          status: interview.status,
          score: interview.score,
          durationMinutes: interview.durationMinutes,
          createdAt: interview.createdAt instanceof Date
            ? interview.createdAt.toISOString()
            : String(interview.createdAt),
          completedAt: interview.completedAt instanceof Date
            ? interview.completedAt.toISOString()
            : interview.completedAt ? String(interview.completedAt) : null,
          aiEvaluation: interview.aiEvaluation,
          skills: cvData?.skills ?? [],
          experience: cvData?.experience ?? [],
          source: "interview" as const,
        };
      }),
    );

    // Convert AI applications to applicant format (only those without interviews)
    const aiApplicants = await Promise.all(
      aiApplications
        .filter(app => !interviewCvIds.has(app.cvId))
        .map(async (app) => {
          // Get CV data for skills
          const cvData = await storage.getCVExtraction(app.cvId);

          return {
            id: app.id,
            interviewId: null,
            candidateId: app.cvId,
            cvId: app.cvId,
            name: app.candidateName,
            email: app.candidateEmail,
            status: app.status === "ready" ? "PENDING" as const : "PENDING" as const,
            score: app.matchScore,
            durationMinutes: 0,
            createdAt: app.createdAt?.toISOString?.() ?? new Date().toISOString(),
            completedAt: null,
            aiEvaluation: null,
            skills: cvData?.skills ?? [],
            experience: cvData?.experience ?? [],
            source: "ai_match" as const,
            matchReasons: app.matchReasons,
            skillGaps: app.skillGaps,
            questionsHash: app.questionsHash,
          };
        }),
    );

    // Combine interview applicants and AI-matched applicants
    let applicants: ApplicantResponse[] = [...interviewApplicants, ...aiApplicants];

    // Only use demo data for demo jobs when there are no real applicants
    if (applicants.length === 0 && isDemoJob) {
      usingDemoData = true;
      const demoApplicants = getDemoApplicants();
      applicants = demoApplicants.map((demo) => ({
        id: demo.id,
        interviewId: demo.id,
        candidateId: demo.id,
        cvId: null,
        name: demo.name,
        email: demo.email,
        status: "COMPLETED" as const,
        score: demo.score,
        durationMinutes: demo.durationMinutes,
        createdAt: demo.completedAt instanceof Date
          ? demo.completedAt.toISOString()
          : String(demo.completedAt),
        completedAt: demo.completedAt instanceof Date
          ? demo.completedAt.toISOString()
          : String(demo.completedAt),
        aiEvaluation: demo.aiEvaluation,
        skills: [],
        experience: [],
        source: "demo" as const,
      }));
      console.log(`📋 Using demo applicants for demo job ${jobId}`);
    }

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

    return NextResponse.json({
      success: true,
      data: {
        job: {
          id: job.id,
          title: job.title,
          company: job.company,
        },
        applicants,
        stats: {
          total: applicants.length,
          completed: applicants.filter((a) => a.status === "COMPLETED").length,
          pending: applicants.filter((a) => a.status === "PENDING").length,
          inProgress: applicants.filter((a) => a.status === "IN_PROGRESS").length,
          averageScore:
            applicants.filter((a) => a.score !== undefined).length > 0
              ? Math.round(
                  applicants
                    .filter((a) => a.score !== undefined)
                    .reduce((sum, a) => sum + (a.score ?? 0), 0) /
                    applicants.filter((a) => a.score !== undefined).length,
                )
              : null,
        },
        usingDemoData,
      },
    });
  } catch (error) {
    console.error("Failed to fetch job applicants:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch applicants" },
      { status: 500 },
    );
  }
}
