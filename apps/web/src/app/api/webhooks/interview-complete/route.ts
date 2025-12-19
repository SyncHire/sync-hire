/**
 * Webhook: Interview Complete
 * Receives notification when an AI interview is completed
 * POST /api/webhooks/interview-complete
 */
import { NextResponse } from "next/server";
import type { AIEvaluation } from "@/lib/types/interview-types";
import type { Interview } from "@/lib/storage/storage-interface";
import { getStorage } from "@/lib/storage/storage-factory";
import { InterviewStatus, ApplicationStatus } from "@sync-hire/database";

interface TranscriptEntry {
  speaker: string;
  text: string;
  timestamp: number;
}

interface AIEvaluationPayload {
  overallScore: number;
  categories?: {
    technicalKnowledge?: number;
    problemSolving?: number;
    communication?: number;
    experienceRelevance?: number;
  };
  strengths?: string[];
  improvements?: string[];
  summary?: string;
}

interface InterviewCompletePayload {
  interviewId: string;
  candidateName: string;
  jobTitle: string;
  durationMinutes: number;
  completedAt: string;
  status: string;
  transcript?: TranscriptEntry[];
  score?: number;
  aiEvaluation?: AIEvaluationPayload;
}

/**
 * Parse interview ID to extract jobId and candidateId
 * Supports formats:
 * - "interview-{n}" -> mock interview, look up in mock data
 * - "application-{jobId}-{userId}" -> application-based interview
 */
function parseInterviewId(interviewId: string): {
  jobId: string;
  candidateId: string;
} | null {
  // Handle application-based IDs: application-job-5-demo-user
  if (interviewId.startsWith("application-")) {
    const match = interviewId.match(/^application-(job-\d+)-(.+)$/);
    if (match) {
      return {
        jobId: match[1],
        candidateId: match[2],
      };
    }
  }

  // Handle mock interview IDs: interview-{n}
  // These need to look up the job from mock data, but we'll use a generic approach
  if (interviewId.startsWith("interview-")) {
    // For mock interviews, we'll use demo-user as candidateId
    // The jobId will need to be looked up from stored interview data
    return {
      jobId: "", // Will be looked up from existing interview data
      candidateId: "demo-user",
    };
  }

  return null;
}

/**
 * Format transcript array into a readable string
 */
function formatTranscript(transcript: TranscriptEntry[]): string {
  return transcript
    .map((entry) => {
      const speaker = entry.speaker === "agent" ? "AI Interviewer" : "Candidate";
      const time = new Date(entry.timestamp * 1000).toISOString().substr(14, 5);
      return `[${time}] ${speaker}: ${entry.text}`;
    })
    .join("\n\n");
}

export async function POST(request: Request) {
  try {
    const payload: InterviewCompletePayload = await request.json();

    console.log("📥 Interview completion webhook received:", {
      interviewId: payload.interviewId,
      candidateName: payload.candidateName,
      jobTitle: payload.jobTitle,
      durationMinutes: payload.durationMinutes,
      completedAt: payload.completedAt,
      status: payload.status,
      transcriptLength: payload.transcript?.length ?? 0,
    });

    // Log transcript summary
    if (payload.transcript && payload.transcript.length > 0) {
      console.log("📝 Transcript received:");
      payload.transcript.forEach((entry) => {
        const prefix = entry.speaker === "agent" ? "🤖" : "👤";
        console.log(
          `   ${prefix} [${entry.timestamp.toFixed(1)}s] ${entry.text.substring(0, 100)}${entry.text.length > 100 ? "..." : ""}`,
        );
      });
    }

    // Parse interview ID to get job and candidate info
    const parsed = parseInterviewId(payload.interviewId);
    if (!parsed) {
      console.error("❌ Could not parse interview ID:", payload.interviewId);
      return NextResponse.json(
        { error: "Invalid interview ID format" },
        { status: 400 },
      );
    }

    const storage = getStorage();

    // Try to get existing interview data (for jobId if mock interview)
    let jobId = parsed.jobId;
    const existingInterview = await storage.getInterview(payload.interviewId);
    if (existingInterview) {
      jobId = existingInterview.jobId;
    }

    // If we still don't have a jobId, try to extract from the interview ID pattern
    if (!jobId && payload.interviewId.startsWith("interview-")) {
      // For mock interviews, the job is typically job-{same number}
      const num = payload.interviewId.replace("interview-", "");
      jobId = `job-${num}`;
    }

    // Format transcript
    const transcriptText = payload.transcript
      ? formatTranscript(payload.transcript)
      : undefined;

    // Build AI evaluation if provided
    let aiEvaluation: AIEvaluation | undefined;
    if (payload.aiEvaluation) {
      aiEvaluation = {
        overallScore: payload.aiEvaluation.overallScore,
        categories: {
          technicalKnowledge: payload.aiEvaluation.categories?.technicalKnowledge ?? 75,
          problemSolving: payload.aiEvaluation.categories?.problemSolving ?? 75,
          communication: payload.aiEvaluation.categories?.communication ?? 75,
          experienceRelevance: payload.aiEvaluation.categories?.experienceRelevance ?? 75,
        },
        strengths: payload.aiEvaluation.strengths ?? [
          "Good technical foundation",
          "Clear communication",
        ],
        improvements: payload.aiEvaluation.improvements ?? [
          "Could provide more detailed examples",
        ],
        summary: payload.aiEvaluation.summary ?? "Interview completed successfully.",
      };
    }

    // Create/update interview record with COMPLETED status
    const interview: Interview = {
      id: payload.interviewId,
      jobId: jobId || "unknown",
      candidateId: parsed.candidateId,
      status: InterviewStatus.COMPLETED,
      callId: payload.interviewId,
      transcript: transcriptText ?? null,
      score: payload.score ?? aiEvaluation?.overallScore ?? null,
      durationMinutes: payload.durationMinutes,
      createdAt: existingInterview?.createdAt || new Date(),
      completedAt: new Date(payload.completedAt),
      aiEvaluation: aiEvaluation ?? null,
    };

    // Save interview to storage
    await storage.saveInterview(payload.interviewId, interview);
    console.log("✅ Interview saved to storage:", payload.interviewId);

    // Also update the CandidateApplication status if this is an application-based interview
    if (payload.interviewId.startsWith("application-") && jobId) {
      try {
        // Find and update the application for this job
        const jobApplications = await storage.getApplicationsForJob(jobId);
        for (const app of jobApplications) {
          if (app.interviewId === payload.interviewId ||
              payload.interviewId.includes(app.jobId)) {
            app.status = ApplicationStatus.COMPLETED;
            app.updatedAt = new Date();
            await storage.saveApplication(app);
            console.log(`✅ Updated application ${app.id} status to completed`);
            break;
          }
        }
      } catch (appError) {
        console.error("⚠️ Could not update application status:", appError);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Interview completion saved",
      interviewId: payload.interviewId,
      status: "COMPLETED",
    });
  } catch (error) {
    console.error("Error processing interview completion webhook:", error);
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 },
    );
  }
}
