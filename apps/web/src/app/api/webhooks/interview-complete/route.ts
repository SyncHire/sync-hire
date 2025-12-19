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
import { logger } from "@/lib/logger";

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

    logger.info("Interview completion webhook received", {
      api: "webhooks/interview-complete",
      operation: "receive",
      interviewId: payload.interviewId,
      candidateName: payload.candidateName,
      jobTitle: payload.jobTitle,
      durationMinutes: payload.durationMinutes,
      completedAt: payload.completedAt,
      status: payload.status,
      transcriptLength: payload.transcript?.length ?? 0,
    });

    // Log transcript summary for debugging
    if (payload.transcript && payload.transcript.length > 0) {
      logger.debug(`Transcript received with ${payload.transcript.length} entries`, {
        api: "webhooks/interview-complete",
        operation: "parseTranscript",
        interviewId: payload.interviewId,
      });
    }

    const storage = getStorage();

    // Look up existing interview from database
    const existingInterview = await storage.getInterview(payload.interviewId);
    if (!existingInterview) {
      logger.error(new Error("Interview not found"), {
        api: "webhooks/interview-complete",
        operation: "getInterview",
        interviewId: payload.interviewId,
      });
      return NextResponse.json(
        { error: "Interview not found" },
        { status: 404 },
      );
    }

    const { jobId, candidateId } = existingInterview;

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
      jobId,
      candidateId,
      status: InterviewStatus.COMPLETED,
      callId: payload.interviewId,
      transcript: transcriptText ?? null,
      score: payload.score ?? aiEvaluation?.overallScore ?? null,
      durationMinutes: payload.durationMinutes,
      createdAt: existingInterview.createdAt,
      completedAt: new Date(payload.completedAt),
      aiEvaluation: aiEvaluation ?? null,
    };

    // Save interview to storage
    await storage.saveInterview(payload.interviewId, interview);
    logger.info("Interview saved to storage", {
      api: "webhooks/interview-complete",
      operation: "saveInterview",
      interviewId: payload.interviewId,
    });

    // Update associated application status if exists
    try {
      const application = await storage.getApplicationByInterviewId(payload.interviewId);
      if (application) {
        application.status = ApplicationStatus.COMPLETED;
        application.updatedAt = new Date();
        await storage.saveApplication(application);
        logger.info("Updated application status to completed", {
          api: "webhooks/interview-complete",
          operation: "updateApplicationStatus",
          applicationId: application.id,
          interviewId: payload.interviewId,
        });
      }
    } catch (appError) {
      logger.warn("Could not update application status", {
        api: "webhooks/interview-complete",
        operation: "updateApplicationStatus",
        interviewId: payload.interviewId,
        error: appError instanceof Error ? appError.message : String(appError),
      });
    }

    return NextResponse.json({
      success: true,
      message: "Interview completion saved",
      interviewId: payload.interviewId,
      status: "COMPLETED",
    });
  } catch (error) {
    logger.error(error, {
      api: "webhooks/interview-complete",
      operation: "processWebhook",
    });
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 },
    );
  }
}
