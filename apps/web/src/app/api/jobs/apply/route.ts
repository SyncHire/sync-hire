/**
 * POST /api/jobs/apply
 *
 * Apply CV to a job position with automatic interview question generation.
 * Generates 6-8 personalized questions based on CV + Job Description using Gemini.
 */

import { type NextRequest, NextResponse } from "next/server";
import { generateInterviewQuestions } from "@/lib/backend/question-generator";
import { getStorage } from "@/lib/storage/storage-factory";
import type { InterviewQuestions } from "@/lib/storage/storage-interface";
import { generateStringHash } from "@/lib/utils/hash-utils";

export async function POST(request: NextRequest) {
  try {
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

    // Verify CV extraction exists
    const cvData = await storage.getCVExtraction(cvId);
    if (!cvData) {
      return NextResponse.json(
        {
          error: "CV not found",
          message: `No CV extraction found for ID: ${cvId}`,
        },
        { status: 400 },
      );
    }

    // Try to get JD extraction first (for jobs created via upload)
    let jdData = await storage.getExtraction(jobId);

    // If no extraction, try to get job directly and build minimal JD data
    if (!jdData) {
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

      // Build minimal JD data from job for question generation
      jdData = {
        title: job.title,
        company: job.company,
        location: job.location,
        employmentType: job.type,
        seniority: job.department || "Mid-level",
        requirements: job.requirements,
        responsibilities: job.description ? [job.description] : [],
      };
    }

    // Generate combined hash for questions file (cvId + jobId)
    const combinedHash = generateStringHash(cvId + jobId);

    // Check if questions already exist (caching)
    const existingQuestions = await storage.hasInterviewQuestions(combinedHash);
    if (existingQuestions) {
      const questions = await storage.getInterviewQuestions(combinedHash);
      if (questions) {
        return NextResponse.json(
          {
            data: {
              id: combinedHash,
              cvId,
              jobId,
              questionCount: questions.metadata.questionCount,
              customQuestionCount: questions.metadata.customQuestionCount,
              suggestedQuestionCount: questions.metadata.suggestedQuestionCount,
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
    const customQuestionCount = 0;

    // Build questions file
    const interviewQuestions: InterviewQuestions = {
      metadata: {
        cvId,
        jobId,
        generatedAt: new Date().toISOString(),
        questionCount: customQuestionCount + suggestedQuestions.length,
        customQuestionCount,
        suggestedQuestionCount: suggestedQuestions.length,
      },
      customQuestions,
      suggestedQuestions,
    };

    // Save questions to storage
    await storage.saveInterviewQuestions(combinedHash, interviewQuestions);

    return NextResponse.json(
      {
        data: {
          id: combinedHash,
          cvId,
          jobId,
          questionCount: interviewQuestions.metadata.questionCount,
          customQuestionCount: interviewQuestions.metadata.customQuestionCount,
          suggestedQuestionCount:
            interviewQuestions.metadata.suggestedQuestionCount,
          cached: false,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Apply to job error:", error);

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
