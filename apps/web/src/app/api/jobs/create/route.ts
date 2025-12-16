/**
 * POST /api/jobs/create
 *
 * Creates a new job posting with extracted data and custom questions
 */

import { type NextRequest, NextResponse } from "next/server";
import { ApplicationStatus, ApplicationSource, MatchingStatus, JobStatus } from "@sync-hire/database";
import type { ExtractedCVData, ExtractedJobData } from "@sync-hire/database";
import type { Question } from "@/lib/mock-data";
import { getStorage } from "@/lib/storage/storage-factory";
import type { Job } from "@/lib/storage/storage-interface";
import { generateSmartMergedQuestions } from "@/lib/backend/question-generator";
import { jobToExtractedJobData } from "@/lib/utils/type-adapters";
import { geminiClient } from "@/lib/gemini-client";
import { z } from "zod";
import { requireOrgMembership } from "@/lib/auth-server";

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
async function triggerCandidateMatching(jobId: string): Promise<{ matchedCount: number; candidateNames: string[] }> {
  try {
    const storage = getStorage();
    const job = await storage.getJob(jobId);
    if (!job) {
      console.log(`[auto-match] Job not found: ${jobId}`);
      return { matchedCount: 0, candidateNames: [] };
    }

    console.log(`\n🤖 [auto-match] Starting automatic candidate matching for job: ${jobId}`);
    console.log(`📋 [auto-match] Job: "${job.title}" at ${job.organization.name}`);

    // Get all CVs
    const cvExtractions = await storage.getAllCVExtractions();
    console.log(`📁 [auto-match] Found ${cvExtractions.length} CV(s) in system`);

    if (cvExtractions.length === 0) {
      console.log(`⚠️ [auto-match] No CVs to match against`);
      // Update job status to complete even with no CVs
      const noMatchJob = await storage.getJob(jobId);
      if (noMatchJob) {
        noMatchJob.aiMatchingStatus = MatchingStatus.COMPLETE;
        await storage.saveJob(jobId, noMatchJob);
        console.log(`✅ [auto-match] Job status updated to COMPLETE (no CVs)`);
      }
      return { matchedCount: 0, candidateNames: [] };
    }

    const matchThreshold = job.aiMatchingThreshold || 80;
    console.log(`🎯 [auto-match] Match threshold: ${matchThreshold}%`);

    let matchedCount = 0;
    const matchedCandidates: string[] = [];

    // Process each CV
    for (const { cvId, userId, data: cvData } of cvExtractions) {
      const candidateName = cvData.personalInfo?.fullName || "Unknown";
      console.log(`\n👤 [auto-match] Processing: ${candidateName}`);

      // Check if application already exists
      const existingApplications = await storage.getApplicationsForJob(jobId);
      const alreadyApplied = existingApplications.some(app => app.cvUploadId === cvId);

      if (alreadyApplied) {
        console.log(`   ⏭️  Skipped: Already applied`);
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
        console.error(`   ❌ Match calculation failed:`, err);
        continue;
      }

      console.log(`   📊 Match score: ${matchScore}%`);

      if (matchScore >= matchThreshold) {
        console.log(`   🎉 MATCHED!`);

        const applicationId = `app-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

        const application = {
          id: applicationId,
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
          interviewId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await storage.saveApplication(application);
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
          console.log(`   ✅ Questions generated for ${candidateName}`);
        }).catch(async (err) => {
          console.error(`[auto-match] SYSTEM FAILURE - Question generation failed for ${candidateName}:`, err);
          // Update application status to indicate failure
          // TODO: Add GENERATION_FAILED status to ApplicationStatus enum to distinguish from human rejection
          const app = await storage.getApplication(applicationId);
          if (app) {
            app.status = ApplicationStatus.REJECTED; // Mark as rejected so it doesn't stay stuck
            app.updatedAt = new Date();
            await storage.saveApplication(app);
            console.warn(`[auto-match] Application ${applicationId} marked as REJECTED (due to SYSTEM FAILURE in question generation, not human rejection)`);
          }
        });
      } else {
        console.log(`   ❌ Below threshold`);
      }
    }

    console.log(`\n📊 [auto-match] Complete: ${matchedCount} candidate(s) matched\n`);

    // Update job status to complete
    const finalJob = await storage.getJob(jobId);
    if (finalJob) {
      finalJob.aiMatchingStatus = MatchingStatus.COMPLETE;
      await storage.saveJob(jobId, finalJob);
      console.log(`✅ [auto-match] Job status updated to COMPLETE`);
    }

    return { matchedCount, candidateNames: matchedCandidates };
  } catch (error) {
    console.error("[auto-match] Error:", error);

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
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required with active organization",
        },
        { status: 401 },
      );
    }

    const body = (await request.json()) as CreateJobRequest;

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

    // AI matching is enabled by default
    const aiMatchingEnabled = body.aiMatchingEnabled !== false;
    const aiMatchingThreshold = body.aiMatchingThreshold || 80;

    // Generate job ID
    const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    // Check if there are any CVs to match against (only if AI matching enabled)
    const storage = getStorage();
    let hasCVsToMatch = false;
    let cvCount = 0;
    if (aiMatchingEnabled) {
      const cvExtractions = await storage.getAllCVExtractions();
      cvCount = cvExtractions.length;
      hasCVsToMatch = cvCount > 0;
    }

    // Get organization and user from authenticated session
    const organizationId = session.session.activeOrganizationId;
    const createdById = session.user.id;

    // This should not happen due to requireOrgMembership, but TypeScript needs the check
    if (!organizationId) {
      return NextResponse.json(
        {
          success: false,
          error: "No active organization selected",
        },
        { status: 400 },
      );
    }

    // Fetch or create placeholder organization for the job response
    const existingOrg = await storage.getOrganization(organizationId);
    const organization = existingOrg || {
      id: organizationId,
      name: "Demo Company",
      slug: "demo-company",
      logo: null,
      website: null,
      description: null,
      industry: null,
      size: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

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
      console.log(`🚀 [create-job] AI Matching enabled - triggering automatic candidate matching (${cvCount} CVs)`);
      triggerCandidateMatching(job.id).catch(async (err) => {
        console.error("[create-job] Auto-match error:", err);

        // Update job status to indicate failure
        try {
          const failedJob = await storage.getJob(job.id);
          if (failedJob) {
            failedJob.aiMatchingStatus = MatchingStatus.FAILED;
            await storage.saveJob(job.id, failedJob);
          }
        } catch (updateErr) {
          console.error("[create-job] Failed to update job status:", updateErr);
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
    console.error("Create job error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create job",
      },
      { status: 500 },
    );
  }
}
