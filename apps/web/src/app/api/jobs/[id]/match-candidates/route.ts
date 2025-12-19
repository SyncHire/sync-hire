/**
 * POST /api/jobs/[id]/match-candidates
 *
 * Scans all CVs in the system and finds candidates matching the job requirements.
 * For matches above 80%, creates applications and generates personalized questions.
 */

import { type NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { generateSmartMergedQuestions } from "@/lib/backend/question-generator";
import { geminiClient } from "@/lib/gemini-client";
import { ApplicationStatus, ApplicationSource } from "@sync-hire/database";
import { withRateLimit } from "@/lib/rate-limiter";
import type { ExtractedCVData, ExtractedJobData, CandidateApplication, InterviewQuestions } from "@sync-hire/database";
import type { Question } from "@/lib/types/interview-types";
import { getStorage } from "@/lib/storage/storage-factory";
import { z } from "zod";

const matchResultSchema = z.object({
  matchScore: z.number().min(0).max(100),
  matchReasons: z.array(z.string()),
  skillGaps: z.array(z.string()),
});

async function calculateMatchScore(
  cvData: ExtractedCVData,
  jobTitle: string,
  jobRequirements: string[],
  jobDescription: string
): Promise<{ matchScore: number; matchReasons: string[]; skillGaps: string[] }> {
  const prompt = `Analyze how well this candidate matches the job position.

JOB:
Title: ${jobTitle}
Description: ${jobDescription}
Requirements: ${jobRequirements.join(", ")}

CANDIDATE:
Name: ${cvData.personalInfo.fullName}
Skills: ${cvData.skills?.join(", ") || "Not specified"}
Experience: ${cvData.experience?.map(e => `${e.title} at ${e.company}`).join("; ") || "Not specified"}
Education: ${cvData.education?.map(e => `${e.degree} from ${e.institution}`).join("; ") || "Not specified"}

Return a JSON object with:
- matchScore: number 0-100 (percentage match)
- matchReasons: array of 2-3 specific reasons why this candidate matches
- skillGaps: array of 1-2 skills the candidate may be missing

Be realistic with scoring:
- 90-100: Near-perfect match, all requirements met
- 80-89: Strong match, most requirements met
- 70-79: Good match, key requirements met
- 60-69: Partial match, some requirements met
- Below 60: Weak match`;

  const jsonSchema = z.toJSONSchema(matchResultSchema);

  const response = await geminiClient.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ text: prompt }],
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: jsonSchema as unknown as Record<string, unknown>,
    },
  });

  const content = response.text || "";
  const parsed = JSON.parse(content);
  return matchResultSchema.parse(parsed);
}

/**
 * Generate smart merged questions and save them
 */
async function generateAndSaveQuestions(
  storage: Awaited<ReturnType<typeof getStorage>>,
  cvData: ExtractedCVData,
  job: { title: string; organization: { name: string }; requirements: string[]; description: string; questions?: Array<{ id: string; content: string; type: string; duration: number; category: string | null }> },
  cvId: string,
  jobId: string,
  applicationId: string
) {
  try {
    // Build JD data for question generator
    const jdData: ExtractedJobData = {
      title: job.title,
      company: job.organization.name,
      location: "",
      employmentType: "Full-time",
      workArrangement: "On-site",
      seniority: "",
      requirements: job.requirements,
      responsibilities: [job.description],
    };

    // Map job questions to Question interface format
    // DB questions have `content` and different type enum, map to Question interface
    const questionsWithCategory: Question[] = (job.questions || []).map(q => ({
      id: q.id,
      text: q.content, // DB stores as `content`, Question interface uses `text`
      type: "text" as const, // DB uses SHORT_ANSWER/LONG_ANSWER, map to "text" for interview
      duration: q.duration,
      category: (q.category ?? "Technical Skills") as Question["category"],
    }));

    // Generate smart merged questions
    const mergedQuestions = await generateSmartMergedQuestions(
      cvData,
      jdData,
      questionsWithCategory
    );

    // Build interview questions structure
    const interviewQuestions: InterviewQuestions = {
      metadata: {
        cvId,
        jobId,
        generatedAt: new Date().toISOString(),
      },
      customQuestions: mergedQuestions
        .filter(q => q.source === "job")
        .map((q, i) => ({
          id: q.originalId || `job-${i}`,
          type: "LONG_ANSWER" as const,
          content: q.content,
          required: true,
          order: i,
        })),
      suggestedQuestions: mergedQuestions
        .filter(q => q.source === "ai-personalized")
        .map(q => ({
          content: q.content,
          reason: q.reason,
          category: q.category,
        })),
    };

    // Save questions
    await storage.saveInterviewQuestions(cvId, jobId, interviewQuestions);

    // Update application status to ready
    const application = await storage.getApplication(applicationId);
    if (application) {
      application.status = ApplicationStatus.READY;
      application.updatedAt = new Date();
      await storage.saveApplication(application);
    }

    logger.info("Generated questions for application", { api: "jobs/match-candidates", applicationId, questionCount: mergedQuestions.length });
  } catch (error) {
    logger.error(error, {
      api: "jobs/[id]/match-candidates",
      operation: "generateQuestions",
      jobId,
      cvId,
      applicationId,
    });
    // Update application status to indicate failure so it doesn't stay stuck
    // TODO: Add GENERATION_FAILED status to ApplicationStatus enum to distinguish from human rejection
    const application = await storage.getApplication(applicationId);
    if (application) {
      application.status = ApplicationStatus.REJECTED;
      application.updatedAt = new Date();
      await storage.saveApplication(application);
    }
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Rate limit check (expensive tier - N x Gemini calls)
    const rateLimitResponse = await withRateLimit(request, "expensive", "jobs/match-candidates");
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const { id: jobId } = await params;
    const storage = getStorage();

    logger.info("Starting candidate match", { api: "jobs/match-candidates", jobId });

    // Get job
    const job = await storage.getJob(jobId);
    if (!job) {
      logger.warn("Job not found", { api: "jobs/match-candidates", jobId });
      return NextResponse.json(
        {
          success: false,
          error: "Job not found",
          message: `No job found with ID: ${jobId}`,
        },
        { status: 400 },
      );
    }

    logger.info("Processing job", { api: "jobs/match-candidates", jobId, jobTitle: job.title, organization: job.organization.name });

    // Get all CVs
    const cvExtractions = await storage.getAllCVExtractions();
    logger.info("Found CVs to process", { api: "jobs/match-candidates", jobId, cvCount: cvExtractions.length });

    if (cvExtractions.length === 0) {
      logger.info("No CVs to match against", { api: "jobs/match-candidates", jobId });
      return NextResponse.json({
        success: true,
        data: {
          matchedCount: 0,
          applications: [],
          message: "No CVs found in the system",
        },
      });
    }

    const matchThreshold = job.aiMatchingThreshold || 80;
    logger.info("Match threshold set", { api: "jobs/match-candidates", jobId, matchThreshold });

    const applications: CandidateApplication[] = [];
    let skippedCount = 0;
    let belowThresholdCount = 0;
    let failedCount = 0;

    // Process each CV
    for (const { cvId, userId, data: cvData } of cvExtractions) {
      const candidateName = cvData.personalInfo?.fullName || "Unknown";
      logger.info("Processing candidate", { api: "jobs/match-candidates", jobId, cvId, candidateName });

      // Check if application already exists
      const existingApplications = await storage.getApplicationsForJob(jobId);
      const alreadyApplied = existingApplications.some(app => app.cvUploadId === cvId);

      if (alreadyApplied) {
        logger.info("Candidate already applied, skipping", { api: "jobs/match-candidates", jobId, cvId });
        skippedCount++;
        continue;
      }

      // Calculate match score
      logger.info("Calculating match score", { api: "jobs/match-candidates", jobId, cvId });
      let matchScore: number;
      let matchReasons: string[];
      let skillGaps: string[];

      try {
        const result = await calculateMatchScore(
          cvData,
          job.title,
          job.requirements,
          job.description
        );
        matchScore = result.matchScore;
        matchReasons = result.matchReasons;
        skillGaps = result.skillGaps;
      } catch (error) {
        logger.error(error, {
          api: "jobs/[id]/match-candidates",
          operation: "calculateMatchScore",
          jobId,
          cvId,
          candidateName,
        });
        failedCount++;
        continue;
      }

      logger.info("Match score calculated", { api: "jobs/match-candidates", jobId, cvId, matchScore, matchThreshold, matchReasons, skillGaps });

      // Only create application if above threshold
      if (matchScore >= matchThreshold) {
        logger.info("Candidate matched, creating application", { api: "jobs/match-candidates", jobId, cvId, matchScore });

        // Save application (ID auto-generated by database via upsert on jobId + userId)
        const savedApplication = await storage.saveApplication({
          jobId,
          cvUploadId: cvId,
          userId,
          candidateName: cvData.personalInfo.fullName || "Unknown Candidate",
          candidateEmail: cvData.personalInfo.email || "",
          matchScore,
          matchReasons,
          skillGaps,
          status: ApplicationStatus.GENERATING_QUESTIONS,
          source: ApplicationSource.AI_MATCH,
          questionsData: null,
          interviewId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        applications.push(savedApplication);

        // Note: applicantsCount is calculated on read from actual applications
        // No need to update counter here to avoid race conditions

        // Generate smart merged questions in background
        generateAndSaveQuestions(
          storage,
          cvData,
          job,
          cvId,
          jobId,
          savedApplication.id
        ).catch((err) =>
          logger.error(err, {
            api: "jobs/[id]/match-candidates",
            operation: "generateQuestions",
            jobId,
            cvId,
            applicationId: savedApplication.id,
          })
        );
      } else {
        logger.info("Candidate below threshold", { api: "jobs/match-candidates", jobId, cvId, matchScore, matchThreshold });
        belowThresholdCount++;
      }
    }

    // Summary
    logger.info("Candidate matching complete", {
      api: "jobs/match-candidates",
      jobId,
      totalCVs: cvExtractions.length,
      skipped: skippedCount,
      belowThreshold: belowThresholdCount,
      failed: failedCount,
      matched: applications.length,
    });

    return NextResponse.json({
      success: true,
      data: {
        matchedCount: applications.length,
        threshold: matchThreshold,
        applications: applications.map(app => ({
          id: app.id,
          candidateName: app.candidateName,
          matchScore: app.matchScore,
          status: app.status,
        })),
      },
    });
  } catch (error) {
    logger.error(error, { api: "jobs/[id]/match-candidates", operation: "match" });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to match candidates",
      },
      { status: 500 }
    );
  }
}
