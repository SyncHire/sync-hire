/**
 * POST /api/jobs/create
 *
 * Creates a new job posting with extracted data and custom questions
 */

import { type NextRequest, NextResponse } from "next/server";
import type { ExtractedJobData, Job } from "@/lib/mock-data";
import {
  createJob,
  createJobDescriptionVersion,
} from "@/lib/mock-data";
import { getStorage } from "@/lib/storage/storage-factory";

interface CreateJobRequest {
  title: string;
  description: string;
  location: string;
  employmentType: string;
  workArrangement?: string;
  requirements: string[];
  responsibilities: string[];
  seniority: string;
  company?: string;
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
  employerId?: string;
  aiMatchingEnabled?: boolean;
  aiMatchingThreshold?: number;
}

/**
 * Trigger candidate matching and return match count
 */
async function triggerCandidateMatching(jobId: string): Promise<{ matchedCount: number; candidateNames: string[] }> {
  try {
    // Import dynamically to avoid circular dependencies
    const { generateSmartMergedQuestions } = await import("@/lib/backend/question-generator");
    const { generateStringHash } = await import("@/lib/utils/hash-utils");
    const { geminiClient } = await import("@/lib/gemini-client");
    const { z } = await import("zod");

    const storage = getStorage();
    const job = await storage.getJob(jobId);
    if (!job) {
      console.log(`[auto-match] Job not found: ${jobId}`);
      return { matchedCount: 0, candidateNames: [] };
    }

    console.log(`\n🤖 [auto-match] Starting automatic candidate matching for job: ${jobId}`);
    console.log(`📋 [auto-match] Job: "${job.title}" at ${job.company}`);

    // Get all CVs
    const cvExtractions = await storage.getAllCVExtractions();
    console.log(`📁 [auto-match] Found ${cvExtractions.length} CV(s) in system`);

    if (cvExtractions.length === 0) {
      console.log(`⚠️ [auto-match] No CVs to match against`);
      return { matchedCount: 0, candidateNames: [] };
    }

    const matchThreshold = job.aiMatchingThreshold || 80;
    console.log(`🎯 [auto-match] Match threshold: ${matchThreshold}%`);

    let matchedCount = 0;
    const matchedCandidates: string[] = [];

    // Process each CV
    for (const { cvId, data: cvData } of cvExtractions) {
      const candidateName = cvData.personalInfo?.fullName || "Unknown";
      console.log(`\n👤 [auto-match] Processing: ${candidateName}`);

      // Check if application already exists
      const existingApplications = await storage.getApplicationsForJob(jobId);
      const alreadyApplied = existingApplications.some(app => app.cvId === cvId);

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
        const questionsHash = generateStringHash(cvId + jobId);

        const application = {
          id: applicationId,
          jobId,
          cvId,
          candidateName: cvData.personalInfo.fullName || "Unknown",
          candidateEmail: cvData.personalInfo.email || "",
          matchScore,
          matchReasons,
          skillGaps,
          status: "generating_questions" as const,
          questionsHash,
          source: "ai_match" as const,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await storage.saveApplication(application);
        matchedCount++;
        matchedCandidates.push(candidateName);

        // Update job applicant count
        const updatedJob = { ...job, applicantsCount: (job.applicantsCount || 0) + 1 };
        await storage.saveJob(jobId, updatedJob);

        // Generate questions in background (don't await)
        generateSmartMergedQuestions(cvData, {
          title: job.title,
          company: job.company,
          location: job.location,
          employmentType: job.type as any,
          workArrangement: job.workArrangement as any,
          seniority: "",
          requirements: job.requirements,
          responsibilities: [job.description],
        }, job.questions as any).then(async (mergedQuestions) => {
          const interviewQuestions = {
            metadata: {
              cvId,
              jobId,
              generatedAt: new Date().toISOString(),
              questionCount: mergedQuestions.length,
              customQuestionCount: mergedQuestions.filter(q => q.source === "job").length,
              suggestedQuestionCount: mergedQuestions.filter(q => q.source === "ai-personalized").length,
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

          await storage.saveInterviewQuestions(questionsHash, interviewQuestions);

          // Update application status
          const app = await storage.getApplication(applicationId);
          if (app) {
            app.status = "ready";
            app.updatedAt = new Date();
            await storage.saveApplication(app);
          }
          console.log(`   ✅ Questions generated for ${candidateName}`);
        }).catch(err => console.error(`   ❌ Question generation failed:`, err));
      } else {
        console.log(`   ❌ Below threshold`);
      }
    }

    console.log(`\n📊 [auto-match] Complete: ${matchedCount} candidate(s) matched\n`);

    // Update job status to complete
    const finalJob = await storage.getJob(jobId);
    if (finalJob) {
      finalJob.aiMatchingStatus = "complete";
      await storage.saveJob(jobId, finalJob);
      console.log(`✅ [auto-match] Job status updated to 'complete'`);
    }

    return { matchedCount, candidateNames: matchedCandidates };
  } catch (error) {
    console.error("[auto-match] Error:", error);

    // Update job status to complete even on error
    const storage = getStorage();
    const errorJob = await storage.getJob(jobId);
    if (errorJob) {
      errorJob.aiMatchingStatus = "complete";
      await storage.saveJob(jobId, errorJob);
    }

    return { matchedCount: 0, candidateNames: [] };
  }
}

export async function POST(request: NextRequest) {
  try {
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

    // Build questions array from customQuestions
    const questions = (body.customQuestions || []).map((q, index) => ({
      id: `q-${Date.now()}-${index}`,
      text: q.text,
      type: q.type || "text",
      duration: q.duration || 2,
    }));

    // AI matching is enabled by default
    const aiMatchingEnabled = body.aiMatchingEnabled !== false;
    const aiMatchingThreshold = body.aiMatchingThreshold || 80;

    // Create the job with questions
    const job = createJob({
      title: body.title,
      description: body.description,
      location: body.location,
      type: body.employmentType || "Not specified",
      workArrangement: body.workArrangement || "Not specified",
      requirements: body.requirements || [],
      company: body.company || "Company",
      department: body.department || "Engineering",
      salary: body.salary || "",
      employerId: body.employerId || "employer-1",
      status: "ACTIVE",
      questions: questions,
      aiMatchingEnabled,
      aiMatchingThreshold,
      aiMatchingStatus: aiMatchingEnabled ? "scanning" : "disabled",
    } as Partial<Job>);

    // Create JD version with extraction data
    if (body.originalJDText) {
      const extractedData: ExtractedJobData = {
        title: body.title,
        company: body.company || "Company",
        responsibilities: body.responsibilities || [],
        requirements: body.requirements || [],
        seniority: body.seniority || "",
        location: body.location,
        employmentType: (body.employmentType || "Not specified") as ExtractedJobData["employmentType"],
        workArrangement: (body.workArrangement || "Not specified") as ExtractedJobData["workArrangement"],
      };

      createJobDescriptionVersion(
        job.id,
        body.originalJDText,
        extractedData,
        undefined,
      );
    }

    // Persist job to file storage
    const storage = getStorage();
    await storage.saveJob(job.id, job);

    // Trigger automatic candidate matching in background (don't wait)
    if (aiMatchingEnabled) {
      console.log(`🚀 [create-job] AI Matching enabled - triggering automatic candidate matching`);
      triggerCandidateMatching(job.id).catch(err =>
        console.error("[create-job] Auto-match error:", err)
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id: job.id,
          title: job.title,
          location: job.location,
          customQuestionsCount: questions.length,
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
