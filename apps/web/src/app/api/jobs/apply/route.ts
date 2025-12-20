/**
 * POST /api/jobs/apply
 *
 * Apply CV to a job position with automatic interview question generation.
 * Generates 6-8 personalized questions based on CV + Job Description using Gemini.
 * Requires a valid CV to be uploaded first.
 */

import { type NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { generateInterviewQuestions } from "@/lib/backend/question-generator";
import { getStorage } from "@/lib/storage/storage-factory";
import type { InterviewQuestions } from "@/lib/storage/storage-interface";
import { getQuestionCounts } from "@sync-hire/database";
import { toEmploymentType, toWorkArrangement } from "@/lib/utils/type-adapters";
import { withRateLimit } from "@/lib/rate-limiter";
import { withQuota } from "@/lib/with-quota";
import { trackUsage } from "@/lib/ai-usage-tracker";

export async function POST(request: NextRequest) {
  try {
    // Rate limit check (moderate tier - personalized question generation)
    const rateLimitResponse = await withRateLimit(request, "moderate", "jobs/apply");
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Parse request body
    const body = await request.json();
    const { cvId, jobId } = body;

    // Validate required fields
    if (!cvId || typeof cvId !== "string") {
      return NextResponse.json(
        {
          error: "Invalid request",
          message: "Missing or invalid cvId",
        },
        { status: 400 },
      );
    }

    if (!jobId || typeof jobId !== "string") {
      return NextResponse.json(
        {
          error: "Invalid request",
          message: "Missing or invalid jobId",
        },
        { status: 400 },
      );
    }

    const storage = getStorage();

    // Get CV extraction - return error if not found
    const cvData = await storage.getCVExtraction(cvId);

    if (!cvData) {
      logger.error(new Error("CV not found for interview question generation"), {
        api: "jobs/apply",
        operation: "getCVExtraction",
        cvId,
        jobId,
      });
      return NextResponse.json(
        {
          error: "CV not found",
          message: `Your CV (ID: ${cvId}) was not found. Please re-upload your CV and try again.`,
          action: "Please upload your CV before applying to this job.",
        },
        { status: 404 },
      );
    }

    // Get job for organization ID (needed for quota check)
    const job = await storage.getJob(jobId);
    if (!job) {
      return NextResponse.json(
        {
          error: "Job not found",
          message: `No job found for ID: ${jobId}`,
        },
        { status: 400 },
      );
    }
    const organizationId = job.organizationId;

    // Check quota before generating questions
    const quotaResponse = await withQuota(organizationId, "jobs/apply");
    if (quotaResponse) {
      return quotaResponse;
    }

    // Try to get JD extraction first (for jobs created via upload)
    let jdData = await storage.getExtraction(jobId);

    // If no extraction, build minimal JD data from job
    if (!jdData) {
      jdData = {
        title: job.title,
        company: job.organization.name,
        location: job.location,
        employmentType: toEmploymentType(job.employmentType),
        workArrangement: toWorkArrangement(job.workArrangement),
        seniority: job.department || "Mid-level",
        requirements: job.requirements,
        responsibilities: job.description ? [job.description] : [],
      };
    }

    // Ensure application exists for this user (creates if needed)
    const application = await storage.getOrCreateApplication(cvId, jobId);

    // Check if questions already exist (caching)
    const existingQuestions = await storage.hasInterviewQuestions(cvId, jobId);
    if (existingQuestions) {
      const questions = await storage.getInterviewQuestions(cvId, jobId);
      if (questions) {
        const counts = getQuestionCounts(questions);
        return NextResponse.json(
          {
            data: {
              applicationId: application.id,
              cvId,
              jobId,
              questionCount: counts.total,
              customQuestionCount: counts.custom,
              suggestedQuestionCount: counts.suggested,
              cached: true,
            },
          },
          { status: 200 },
        );
      }
    }

    // Generate questions using Gemini
    const suggestedQuestions = await generateInterviewQuestions(cvData, jdData);

    // Get custom questions from job posting (if any exist)
    // For now, we'll use an empty array since custom questions are stored in the Job model
    // In a real implementation, this would fetch from the Job record
    const customQuestions: InterviewQuestions["customQuestions"] = [];

    // Build questions file
    const interviewQuestions: InterviewQuestions = {
      metadata: {
        cvId,
        jobId,
        generatedAt: new Date().toISOString(),
      },
      customQuestions,
      suggestedQuestions,
    };

    // Save questions to storage
    await storage.saveInterviewQuestions(cvId, jobId, interviewQuestions);

    // Track usage after successful question generation
    await trackUsage(organizationId, "jobs/apply");

    const counts = getQuestionCounts(interviewQuestions);
    return NextResponse.json(
      {
        data: {
          applicationId: application.id,
          cvId,
          jobId,
          questionCount: counts.total,
          customQuestionCount: counts.custom,
          suggestedQuestionCount: counts.suggested,
          cached: false,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    logger.error(error, { api: "jobs/apply", operation: "apply" });

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        error: "Question generation failed",
        message: errorMessage.includes("Failed to generate interview questions")
          ? "Failed to generate interview questions. Please try again."
          : errorMessage,
      },
      { status: 500 },
    );
  }
}
