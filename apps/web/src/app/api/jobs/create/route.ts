/**
 * POST /api/jobs/create
 *
 * Creates a new job posting with extracted data and custom questions
 */

import { type NextRequest, NextResponse } from "next/server";
import { ApplicationStatus, ApplicationSource, MatchingStatus, JobStatus } from "@sync-hire/database";
import type { ExtractedCVData, ExtractedJobData } from "@sync-hire/database";
import type { Question } from "@/lib/types/interview-types";
import { getStorage } from "@/lib/storage/storage-factory";
import type { Job } from "@/lib/storage/storage-interface";
import { generateSmartMergedQuestions } from "@/lib/backend/question-generator";
import { jobToExtractedJobData } from "@/lib/utils/type-adapters";
import { geminiClient } from "@/lib/gemini-client";
import { z } from "zod";
import { requireOrgMembership } from "@/lib/auth-server";
import { logger } from "@/lib/logger";
import type { ApplicationFailure } from "@sync-hire/database";
import { withQuota } from "@/lib/with-quota";
import { trackUsage } from "@/lib/ai-usage-tracker";

/**
 * Determine the initial AI matching status based on configuration
 */
function getInitialMatchingStatus(aiMatchingEnabled: boolean, hasCVsToMatch: boolean): MatchingStatus {
  if (!aiMatchingEnabled) {
    return MatchingStatus.DISABLED;
  }
  if (hasCVsToMatch) {
    return MatchingStatus.SCANNING;
  }
  return MatchingStatus.COMPLETE;
}

interface CreateJobRequest {
  title: string;
  description: string;
  location: string;
  employmentType: string;
  workArrangement?: string;
  requirements: string[];
  responsibilities: string[];
  seniority: string;
  organizationId?: string; // ID of the organization posting the job
  department?: string;
  salary?: string;
  customQuestions?: Array<{
    text: string;
    type: "text" | "video" | "code";
    duration: number;
    order: number;
    source?: "ai" | "custom";
  }>;
  extractionHash?: string;
  originalJDText?: string;
  createdById?: string; // ID of the user creating the job
  aiMatchingEnabled?: boolean;
  aiMatchingThreshold?: number;
}

/**
 * Trigger candidate matching and return match count
 */
async function triggerCandidateMatching(
  jobRef: Pick<Job, "id" | "organizationId">
): Promise<{ matchedCount: number; candidateNames: string[] }> {
  const { id: jobId, organizationId } = jobRef;
  try {
    const storage = getStorage();
    const job = await storage.getJob(jobId);
    if (!job) {
      logger.warn("Job not found for auto-match", {
        api: "jobs/create",
        operation: "auto-match",
        jobId,
      });
      return { matchedCount: 0, candidateNames: [] };
    }

    logger.info("Starting automatic candidate matching", {
      api: "jobs/create",
      operation: "auto-match",
      jobId,
      jobTitle: job.title,
      organization: job.organization.name,
    });

    // Get all CVs
    const cvExtractions = await storage.getAllCVExtractions();
    logger.debug(`Found ${cvExtractions.length} CV(s) in system`, {
      api: "jobs/create",
      operation: "auto-match",
      jobId,
      cvCount: cvExtractions.length,
    });

    if (cvExtractions.length === 0) {
      logger.info("No CVs to match against", {
        api: "jobs/create",
        operation: "auto-match",
        jobId,
      });
      // Update job status to complete even with no CVs
      const noMatchJob = await storage.getJob(jobId);
      if (noMatchJob) {
        noMatchJob.aiMatchingStatus = MatchingStatus.COMPLETE;
        await storage.saveJob(jobId, noMatchJob);
      }
      return { matchedCount: 0, candidateNames: [] };
    }

    const matchThreshold = job.aiMatchingThreshold || 80;

    let matchedCount = 0;
    const matchedCandidates: string[] = [];

    // Process each CV
    for (const { cvId, userId, data: cvData } of cvExtractions) {
      const candidateName = cvData.personalInfo?.fullName || "Unknown";

      // Check if application already exists
      const existingApplications = await storage.getApplicationsForJob(jobId);
      const alreadyApplied = existingApplications.some(app => app.cvUploadId === cvId);

      if (alreadyApplied) {
        continue;
      }

      // Calculate match score using Gemini
      const matchResultSchema = z.object({
        matchScore: z.number().min(0).max(100),
        matchReasons: z.array(z.string()),
        skillGaps: z.array(z.string()),
      });

      let matchScore = 0;
      let matchReasons: string[] = [];
      let skillGaps: string[] = [];

      try {
        const prompt = `Analyze how well this candidate matches the job position.

JOB:
Title: ${job.title}
Description: ${job.description}
Requirements: ${job.requirements.join(", ")}

CANDIDATE:
Name: ${cvData.personalInfo.fullName}
Skills: ${cvData.skills?.join(", ") || "Not specified"}
Experience: ${cvData.experience?.map(e => `${e.title} at ${e.company}`).join("; ") || "Not specified"}

Return JSON with: matchScore (0-100), matchReasons (array), skillGaps (array)`;

        const jsonSchema = z.toJSONSchema(matchResultSchema);
        const response = await geminiClient.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [{ text: prompt }],
          config: {
            responseMimeType: "application/json",
            responseJsonSchema: jsonSchema as unknown as Record<string, unknown>,
          },
        });

        const parsed = JSON.parse(response.text || "{}");
        const result = matchResultSchema.parse(parsed);
        matchScore = result.matchScore;
        matchReasons = result.matchReasons;
        skillGaps = result.skillGaps;
      } catch (err) {
        logger.error(err, {
          api: "jobs/create",
          operation: "auto-match",
          step: "matchCalculation",
          jobId,
          cvId,
          candidateName,
        });
        continue;
      }

      if (matchScore >= matchThreshold) {

        const savedApplication = await storage.saveApplication({
          jobId,
          cvUploadId: cvId,
          userId,
          candidateName: cvData.personalInfo.fullName || "Unknown",
          candidateEmail: cvData.personalInfo.email || "",
          matchScore,
          matchReasons,
          skillGaps,
          status: ApplicationStatus.GENERATING_QUESTIONS,
          source: ApplicationSource.AI_MATCH,
          questionsData: null,
          failureInfo: null,
          interviewId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        const applicationId = savedApplication.id;
        matchedCount++;
        matchedCandidates.push(candidateName);

        // Note: applicantsCount is calculated on read from actual applications
        // No need to update counter here to avoid race conditions

        // Generate questions in background (don't await)
        // Map job questions to Question interface format
        const questionsWithCategory: Question[] = (job.questions || []).map(q => ({
          id: q.id,
          text: q.content,
          type: "text" as const,
          duration: q.duration,
          category: (q.category ?? "Technical Skills") as Question["category"],
        }));
        const jdData = jobToExtractedJobData(job);
        generateSmartMergedQuestions(cvData as ExtractedCVData, jdData, questionsWithCategory).then(async (mergedQuestions) => {
          const interviewQuestions = {
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

          await storage.saveInterviewQuestions(cvId, jobId, interviewQuestions);

          // Update application status to ready
          const app = await storage.getApplication(applicationId);
          if (app) {
            app.status = ApplicationStatus.READY;
            app.updatedAt = new Date();
            await storage.saveApplication(app);
          }
          logger.info("Questions generated for candidate", {
            api: "jobs/create",
            operation: "auto-match",
            step: "questionGeneration",
            jobId,
            cvId,
            candidateName,
          });
        }).catch(async (err) => {
          logger.error(err, {
            api: "jobs/create",
            operation: "auto-match",
            step: "questionGeneration",
            jobId,
            cvId,
            candidateName,
            applicationId,
          });
          // Update application status to FAILED with structured failure info
          const app = await storage.getApplication(applicationId);
          if (app) {
            const failureInfo: ApplicationFailure = {
              code: "question_generation_failed",
              message: "Failed to generate personalized interview questions",
              step: "question_generation",
              retryable: true,
              occurredAt: new Date().toISOString(),
              details: { cvId, jobId },
            };
            app.status = ApplicationStatus.FAILED;
            app.failureInfo = failureInfo;
            app.updatedAt = new Date();
            await storage.saveApplication(app);
            logger.warn("Application marked as FAILED due to question generation failure", {
              api: "jobs/create",
              operation: "auto-match",
              applicationId,
              failureCode: failureInfo.code,
            });
          }
        });
      }
    }

    logger.info("Automatic candidate matching complete", {
      api: "jobs/create",
      operation: "auto-match",
      jobId,
      matchedCount,
      matchedCandidates,
    });

    // Track AI usage (count = number of CVs processed for matching)
    const processedCvCount = cvExtractions.length;
    if (processedCvCount > 0) {
      await trackUsage(organizationId, "jobs/create", processedCvCount);
    }

    // Update job status to complete
    const finalJob = await storage.getJob(jobId);
    if (finalJob) {
      finalJob.aiMatchingStatus = MatchingStatus.COMPLETE;
      await storage.saveJob(jobId, finalJob);
    }

    return { matchedCount, candidateNames: matchedCandidates };
  } catch (error) {
    logger.error(error, {
      api: "jobs/create",
      operation: "auto-match",
      jobId,
    });

    // Update job status to complete even on error
    const storage = getStorage();
    const errorJob = await storage.getJob(jobId);
    if (errorJob) {
      errorJob.aiMatchingStatus = MatchingStatus.COMPLETE;
      await storage.saveJob(jobId, errorJob);
    }

    return { matchedCount: 0, candidateNames: [] };
  }
}

export async function POST(request: NextRequest) {
  try {
    // Require authenticated user with active organization
    let session;
    try {
      session = await requireOrgMembership();
    } catch (error) {
      logger.error(error, {
        api: "jobs/create",
        operation: "auth",
      });
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required with active organization",
        },
        { status: 401 },
      );
    }

    const body = (await request.json()) as CreateJobRequest;

    // Get organization from authenticated session for quota check
    const organizationId = session.session.activeOrganizationId;
    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: "No active organization selected" },
        { status: 400 },
      );
    }

    // Check AI matching will be enabled and if there are CVs to match
    const aiMatchingEnabled = body.aiMatchingEnabled !== false;
    if (aiMatchingEnabled) {
      // Check quota before creating job (will trigger N AI calls for matching)
      const storage = getStorage();
      const cvExtractions = await storage.getAllCVExtractions();
      const estimatedCalls = cvExtractions.length + 1; // +1 for job creation itself

      if (estimatedCalls > 0) {
        const quotaResponse = await withQuota(organizationId, "jobs/create", {
          estimatedCount: estimatedCalls,
        });
        if (quotaResponse) {
          return quotaResponse;
        }
      }
    }

    // Validate required fields
    if (!body.title || !body.description || !body.location) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: title, description, location",
        },
        { status: 400 },
      );
    }

    // aiMatchingEnabled already set above for quota check
    const aiMatchingThreshold = body.aiMatchingThreshold || 80;

    // Generate job ID
    const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    // Get CV count for matching (storage already created above for quota check)
    const storage = getStorage();
    let hasCVsToMatch = false;
    let cvCount = 0;
    if (aiMatchingEnabled) {
      const cvExtractions = await storage.getAllCVExtractions();
      cvCount = cvExtractions.length;
      hasCVsToMatch = cvCount > 0;
    }

    // organizationId already validated above for quota check
    const createdById = session.user.id;

    // Fetch organization - fail if not found (should not happen with valid session)
    const organization = await storage.getOrganization(organizationId);
    if (!organization) {
      logger.error(new Error("Organization not found"), {
        api: "jobs/create",
        operation: "getOrganization",
        organizationId,
      });
      return NextResponse.json(
        {
          success: false,
          error: "Organization not found",
        },
        { status: 404 },
      );
    }

    // Build extracted data if original JD text provided
    const jdExtraction: ExtractedJobData | null = body.originalJDText ? {
      title: body.title,
      company: organization.name,
      responsibilities: body.responsibilities || [],
      requirements: body.requirements || [],
      seniority: body.seniority || "",
      location: body.location,
      employmentType: (body.employmentType || "Full-time") as ExtractedJobData["employmentType"],
      workArrangement: (body.workArrangement || "On-site") as ExtractedJobData["workArrangement"],
    } : null;

    // Build questions in the database format
    const dbQuestions = (body.customQuestions || []).map((q, index) => ({
      id: `q-${Date.now()}-${index}`,
      jobId,
      content: q.text,
      type: q.type === "video" ? "LONG_ANSWER" as const : "SHORT_ANSWER" as const,
      options: [] as string[],
      duration: q.duration || 2,
      category: null,
      required: true,
      order: index,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    // Create job object matching the Prisma Job type with questions
    const now = new Date();
    const job: Job = {
      id: jobId,
      title: body.title,
      organizationId,
      createdById,
      organization, // Include organization relation
      department: body.department || null,
      location: body.location,
      employmentType: body.employmentType || "Full-time",
      workArrangement: body.workArrangement || null,
      salary: body.salary || null,
      description: body.description,
      requirements: body.requirements || [],
      status: JobStatus.ACTIVE,
      aiMatchingEnabled,
      aiMatchingThreshold,
      // Set to COMPLETE immediately if no CVs to match, otherwise SCANNING
      aiMatchingStatus: getInitialMatchingStatus(aiMatchingEnabled, hasCVsToMatch),
      jdFileUrl: null,
      jdFileHash: null,
      jdExtraction,
      jdVersion: null,
      postedAt: now,
      createdAt: now,
      updatedAt: now,
      questions: dbQuestions,
    };

    // Persist job to storage (storage already initialized above)
    await storage.saveJob(job.id, job);

    // Trigger automatic candidate matching in background (don't wait)
    // Only trigger if AI matching enabled AND there are CVs to match
    if (aiMatchingEnabled && hasCVsToMatch) {
      logger.info("AI Matching enabled - triggering automatic candidate matching", {
        api: "jobs/create",
        operation: "triggerAutoMatch",
        jobId: job.id,
        cvCount,
      });
      triggerCandidateMatching(job).catch(async (err) => {
        logger.error(err, {
          api: "jobs/create",
          operation: "auto-match",
          jobId: job.id,
        });

        // Update job status to indicate failure
        try {
          const failedJob = await storage.getJob(job.id);
          if (failedJob) {
            failedJob.aiMatchingStatus = MatchingStatus.FAILED;
            await storage.saveJob(job.id, failedJob);
          }
        } catch (updateErr) {
          logger.error(updateErr, {
            api: "jobs/create",
            operation: "updateJobStatus",
            jobId: job.id,
          });
        }
      });
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id: job.id,
          title: job.title,
          location: job.location,
          customQuestionsCount: dbQuestions.length,
          status: job.status,
          aiMatchingStatus: job.aiMatchingStatus,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error(error, {
      api: "jobs/create",
      operation: "createJob",
    });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create job",
      },
      { status: 500 },
    );
  }
}
