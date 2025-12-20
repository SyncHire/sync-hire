/**
 * GET /api/orgs/:id/jobs - Retrieve jobs for an organization
 * POST /api/orgs/:id/jobs - Create a new job for an organization
 *
 * Requires authentication and organization membership.
 */

import type {
  ApplicationFailure,
  ExtractedCVData,
  ExtractedJobData,
} from "@sync-hire/database";
import {
  ApplicationSource,
  ApplicationStatus,
  JobStatus,
  MatchingStatus,
} from "@sync-hire/database";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { trackUsage } from "@/lib/ai-usage-tracker";
import { createdResponse, errors, successResponse } from "@/lib/api-response";
import { withOrgMembership } from "@/lib/auth-middleware";
import { generateSmartMergedQuestions } from "@/lib/backend/question-generator";
import { geminiClient } from "@/lib/gemini-client";
import { logger } from "@/lib/logger";
import { getAllJobsData } from "@/lib/server-utils/get-jobs";
import { getStorage } from "@/lib/storage/storage-factory";
import type { Job } from "@/lib/storage/storage-interface";
import type { Question } from "@/lib/types/interview-types";
import { jobToExtractedJobData } from "@/lib/utils/type-adapters";
import { withQuota } from "@/lib/with-quota";

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

    const jobs = await getAllJobsData(organizationId);
    return successResponse({
      success: true,
      data: jobs,
    });
  } catch (error) {
    logger.error(error, { api: "orgs/[id]/jobs", operation: "fetch" });
    return errors.internal("Failed to fetch jobs");
  }
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
  aiMatchingEnabled?: boolean;
  aiMatchingThreshold?: number;
}

/**
 * Determine the initial AI matching status based on configuration
 */
function getInitialMatchingStatus(
  aiMatchingEnabled: boolean,
  hasCVsToMatch: boolean,
): MatchingStatus {
  if (!aiMatchingEnabled) {
    return MatchingStatus.DISABLED;
  }
  if (hasCVsToMatch) {
    return MatchingStatus.SCANNING;
  }
  return MatchingStatus.COMPLETE;
}

/**
 * Trigger candidate matching and return match count
 */
async function triggerCandidateMatching(
  jobRef: Pick<Job, "id" | "organizationId">,
): Promise<{ matchedCount: number; candidateNames: string[] }> {
  const { id: jobId, organizationId } = jobRef;
  try {
    const storage = getStorage();
    const job = await storage.getJob(jobId);
    if (!job) {
      logger.warn("Job not found for auto-match", {
        api: "orgs/[id]/jobs",
        operation: "auto-match",
        jobId,
      });
      return { matchedCount: 0, candidateNames: [] };
    }

    logger.info("Starting automatic candidate matching", {
      api: "orgs/[id]/jobs",
      operation: "auto-match",
      jobId,
      jobTitle: job.title,
      organization: job.organization.name,
    });

    // Get all CVs
    const cvExtractions = await storage.getAllCVExtractions();
    logger.debug(`Found ${cvExtractions.length} CV(s) in system`, {
      api: "orgs/[id]/jobs",
      operation: "auto-match",
      jobId,
      cvCount: cvExtractions.length,
    });

    if (cvExtractions.length === 0) {
      logger.info("No CVs to match against", {
        api: "orgs/[id]/jobs",
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

    const matchResultSchema = z.object({
      matchScore: z.number().min(0).max(100),
      matchReasons: z.array(z.string()),
      skillGaps: z.array(z.string()),
    });

    // Process each CV
    for (const { cvId, userId, data: cvData } of cvExtractions) {
      const candidateName = cvData.personalInfo?.fullName || "Unknown";

      // Check if application already exists
      const existingApplications = await storage.getApplicationsForJob(jobId);
      const alreadyApplied = existingApplications.some(
        (app) => app.cvUploadId === cvId,
      );

      if (alreadyApplied) {
        continue;
      }

      // Calculate match score using Gemini
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
Experience: ${cvData.experience?.map((e) => `${e.title} at ${e.company}`).join("; ") || "Not specified"}

Return JSON with: matchScore (0-100), matchReasons (array), skillGaps (array)`;

        const jsonSchema = z.toJSONSchema(matchResultSchema);
        const geminiResponse = await geminiClient.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [{ text: prompt }],
          config: {
            responseMimeType: "application/json",
            responseJsonSchema: jsonSchema as unknown as Record<
              string,
              unknown
            >,
          },
        });

        const parsed = JSON.parse(geminiResponse.text || "{}");
        const result = matchResultSchema.parse(parsed);
        matchScore = result.matchScore;
        matchReasons = result.matchReasons;
        skillGaps = result.skillGaps;
      } catch (err) {
        logger.error(err, {
          api: "orgs/[id]/jobs",
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

        // Generate questions in background (don't await)
        const questionsWithCategory: Question[] = (job.questions || []).map(
          (q) => ({
            id: q.id,
            text: q.content,
            type: "text" as const,
            duration: q.duration,
            category: (q.category ??
              "Technical Skills") as Question["category"],
          }),
        );
        const jdData = jobToExtractedJobData(job);
        generateSmartMergedQuestions(
          cvData as ExtractedCVData,
          jdData,
          questionsWithCategory,
        )
          .then(async (mergedQuestions) => {
            const interviewQuestions = {
              metadata: {
                cvId,
                jobId,
                generatedAt: new Date().toISOString(),
              },
              customQuestions: mergedQuestions
                .filter((q) => q.source === "job")
                .map((q, i) => ({
                  id: q.originalId || `job-${i}`,
                  type: "LONG_ANSWER" as const,
                  content: q.content,
                  required: true,
                  order: i,
                })),
              suggestedQuestions: mergedQuestions
                .filter((q) => q.source === "ai-personalized")
                .map((q) => ({
                  content: q.content,
                  reason: q.reason,
                  category: q.category,
                })),
            };

            await storage.saveInterviewQuestions(
              cvId,
              jobId,
              interviewQuestions,
            );

            // Update application status to ready
            const app = await storage.getApplication(applicationId);
            if (app) {
              app.status = ApplicationStatus.READY;
              app.updatedAt = new Date();
              await storage.saveApplication(app);
            }
            logger.info("Questions generated for candidate", {
              api: "orgs/[id]/jobs",
              operation: "auto-match",
              step: "questionGeneration",
              jobId,
              cvId,
              candidateName,
            });
          })
          .catch(async (err) => {
            logger.error(err, {
              api: "orgs/[id]/jobs",
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
              logger.warn(
                "Application marked as FAILED due to question generation failure",
                {
                  api: "orgs/[id]/jobs",
                  operation: "auto-match",
                  applicationId,
                  failureCode: failureInfo.code,
                },
              );
            }
          });
      }
    }

    logger.info("Automatic candidate matching complete", {
      api: "orgs/[id]/jobs",
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
      api: "orgs/[id]/jobs",
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: organizationId } = await params;

    // Verify org membership
    const { response, context } = await withOrgMembership(organizationId);
    if (response) {
      return response;
    }

    // Get user ID from context for createdById
    const createdById = context?.userId;
    if (!createdById) {
      return errors.unauthorized();
    }

    const body = (await request.json()) as CreateJobRequest;

    // Validate required fields
    if (!body.title || !body.description || !body.location) {
      return errors.badRequest(
        "Missing required fields: title, description, location",
      );
    }

    const aiMatchingEnabled = body.aiMatchingEnabled !== false;
    const storage = getStorage();

    // Get CVs once for both quota check and matching (avoid duplicate calls)
    let cvCount = 0;
    let hasCVsToMatch = false;

    if (aiMatchingEnabled) {
      const cvExtractions = await storage.getAllCVExtractions();
      cvCount = cvExtractions.length;
      hasCVsToMatch = cvCount > 0;
      const estimatedCalls = cvCount + 1; // +1 for job creation itself

      if (estimatedCalls > 0) {
        const quotaResponse = await withQuota(organizationId, "jobs/create", {
          estimatedCount: estimatedCalls,
        });
        if (quotaResponse) {
          return quotaResponse;
        }
      }
    }

    const aiMatchingThreshold = body.aiMatchingThreshold || 80;

    // Generate job ID
    const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    // Fetch organization - fail if not found
    const organization = await storage.getOrganization(organizationId);
    if (!organization) {
      logger.error(new Error("Organization not found"), {
        api: "orgs/[id]/jobs",
        operation: "getOrganization",
        organizationId,
      });
      return errors.notFound("Organization");
    }

    // Build extracted data if original JD text provided
    const jdExtraction: ExtractedJobData | null = body.originalJDText
      ? {
          title: body.title,
          company: organization.name,
          responsibilities: body.responsibilities || [],
          requirements: body.requirements || [],
          seniority: body.seniority || "",
          location: body.location,
          employmentType: (body.employmentType ||
            "Full-time") as ExtractedJobData["employmentType"],
          workArrangement: (body.workArrangement ||
            "On-site") as ExtractedJobData["workArrangement"],
        }
      : null;

    // Build questions in the database format
    const dbQuestions = (body.customQuestions || []).map((q, index) => ({
      id: `q-${Date.now()}-${index}`,
      jobId,
      content: q.text,
      type:
        q.type === "video"
          ? ("LONG_ANSWER" as const)
          : ("SHORT_ANSWER" as const),
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
      organization,
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
      aiMatchingStatus: getInitialMatchingStatus(
        aiMatchingEnabled,
        hasCVsToMatch,
      ),
      jdFileUrl: null,
      jdFileHash: null,
      jdExtraction,
      jdVersion: null,
      postedAt: now,
      createdAt: now,
      updatedAt: now,
      questions: dbQuestions,
    };

    // Persist job to storage
    await storage.saveJob(job.id, job);

    // Trigger automatic candidate matching in background (don't wait)
    if (aiMatchingEnabled && hasCVsToMatch) {
      logger.info(
        "AI Matching enabled - triggering automatic candidate matching",
        {
          api: "orgs/[id]/jobs",
          operation: "triggerAutoMatch",
          jobId: job.id,
          cvCount,
        },
      );
      triggerCandidateMatching(job).catch(async (err) => {
        logger.error(err, {
          api: "orgs/[id]/jobs",
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
            api: "orgs/[id]/jobs",
            operation: "updateJobStatus",
            jobId: job.id,
          });
        }
      });
    }

    return createdResponse(
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
      `/api/orgs/${organizationId}/jobs/${job.id}`,
    );
  } catch (error) {
    logger.error(error, {
      api: "orgs/[id]/jobs",
      operation: "createJob",
    });
    return errors.internal("Failed to create job");
  }
}
