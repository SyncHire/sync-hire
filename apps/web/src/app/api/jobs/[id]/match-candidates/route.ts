/**
 * POST /api/jobs/[id]/match-candidates
 *
 * Scans all CVs in the system and finds candidates matching the job requirements.
 * For matches above 80%, creates applications and generates personalized questions.
 */

import { type NextRequest, NextResponse } from "next/server";
import { generateSmartMergedQuestions } from "@/lib/backend/question-generator";
import { geminiClient } from "@/lib/gemini-client";
import { ApplicationStatus, ApplicationSource } from "@sync-hire/database";
import type { ExtractedCVData, ExtractedJobData, CandidateApplication, InterviewQuestions } from "@sync-hire/database";
import type { Question } from "@/lib/mock-data";
import { getStorage } from "@/lib/storage/storage-factory";
import { generateStringHash } from "@/lib/utils/hash-utils";
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
  questionsHash: string,
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
    await storage.saveInterviewQuestions(questionsHash, interviewQuestions);

    // Update application status to ready
    const application = await storage.getApplication(applicationId);
    if (application) {
      application.status = ApplicationStatus.READY;
      application.updatedAt = new Date();
      await storage.saveApplication(application);
    }

    console.log(`Generated ${mergedQuestions.length} questions for application ${applicationId}`);
  } catch (error) {
    console.error("Failed to generate questions:", error);
    // Update application status to indicate failure so it doesn't stay stuck
    const application = await storage.getApplication(applicationId);
    if (application) {
      application.status = ApplicationStatus.REJECTED;
      application.updatedAt = new Date();
      await storage.saveApplication(application);
      console.log(`Application ${applicationId} marked as rejected due to question generation failure`);
    }
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params;
    const storage = getStorage();

    console.log(`\n🔍 [match-candidates] Starting match for job: ${jobId}`);

    // Get job
    const job = await storage.getJob(jobId);
    if (!job) {
      console.error(`[match-candidates] Job not found: ${jobId}`);
      return NextResponse.json(
        {
          success: false,
          error: "Job not found",
          message: `No job found with ID: ${jobId}`,
        },
        { status: 400 },
      );
    }

    console.log(`📋 [match-candidates] Job: "${job.title}" at ${job.organization.name}`);

    // Get all CVs
    const cvExtractions = await storage.getAllCVExtractions();
    console.log(`📁 [match-candidates] Found ${cvExtractions.length} CV(s) in system`);

    if (cvExtractions.length === 0) {
      console.log(`⚠️ [match-candidates] No CVs to match against`);
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
    console.log(`🎯 [match-candidates] Match threshold: ${matchThreshold}%`);

    const applications: CandidateApplication[] = [];
    let skippedCount = 0;
    let belowThresholdCount = 0;
    let failedCount = 0;

    // Process each CV
    for (const { cvId, userId, data: cvData } of cvExtractions) {
      const candidateName = cvData.personalInfo?.fullName || "Unknown";
      console.log(`\n👤 [match-candidates] Processing: ${candidateName} (cvId: ${cvId})`);

      // Check if application already exists
      const existingApplications = await storage.getApplicationsForJob(jobId);
      const alreadyApplied = existingApplications.some(app => app.cvUploadId === cvId);

      if (alreadyApplied) {
        console.log(`   ⏭️  Skipped: Already applied to this job`);
        skippedCount++;
        continue;
      }

      // Calculate match score
      console.log(`   🤖 Calculating match score...`);
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
        console.error(`   ❌ Match calculation failed for ${candidateName}:`, error);
        failedCount++;
        continue;
      }

      console.log(`   📊 Match score: ${matchScore}% (threshold: ${matchThreshold}%)`);
      console.log(`   ✅ Reasons: ${matchReasons.join(", ")}`);
      if (skillGaps.length > 0) {
        console.log(`   ⚠️  Gaps: ${skillGaps.join(", ")}`);
      }

      // Only create application if above threshold
      if (matchScore >= matchThreshold) {
        console.log(`   🎉 MATCHED! Creating application...`);
        const applicationId = `app-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const questionsHash = generateStringHash(cvId + jobId);

        const application: CandidateApplication = {
          id: applicationId,
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
          questionsHash,
          interviewId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Save application
        await storage.saveApplication(application);
        applications.push(application);

        // Note: applicantsCount is calculated on read from actual applications
        // No need to update counter here to avoid race conditions

        // Generate smart merged questions in background
        generateAndSaveQuestions(
          storage,
          cvData,
          job,
          questionsHash,
          cvId,
          jobId,
          application.id
        ).catch(err => console.error("Question generation failed:", err));
      } else {
        console.log(`   ❌ Below threshold (${matchScore}% < ${matchThreshold}%) - not matched`);
        belowThresholdCount++;
      }
    }

    // Summary
    console.log(`\n📊 [match-candidates] === SUMMARY ===`);
    console.log(`   Total CVs: ${cvExtractions.length}`);
    console.log(`   Skipped (already applied): ${skippedCount}`);
    console.log(`   Below threshold: ${belowThresholdCount}`);
    console.log(`   Failed (match calculation error): ${failedCount}`);
    console.log(`   Matched: ${applications.length}`);
    console.log(`==============================\n`);

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
    console.error("Match candidates error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to match candidates",
      },
      { status: 500 }
    );
  }
}
