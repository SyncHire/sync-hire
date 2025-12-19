/**
 * POST /api/interviews/[id]/analyze
 * Triggers AI analysis for an interview that is stuck or missing evaluation
 */
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getStorage } from "@/lib/storage/storage-factory";
import { geminiClient } from "@/lib/gemini-client";
import { z } from "zod";
import type { AIEvaluation } from "@/lib/types/interview-types";
import { withRateLimit } from "@/lib/rate-limiter";
import { withQuota } from "@/lib/with-quota";
import { trackUsage } from "@/lib/ai-usage-tracker";

const EvaluationSchema = z.object({
  overallScore: z.number().min(0).max(100),
  categories: z.object({
    technicalKnowledge: z.number().min(0).max(100),
    problemSolving: z.number().min(0).max(100),
    communication: z.number().min(0).max(100),
    experienceRelevance: z.number().min(0).max(100),
  }),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  summary: z.string(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Rate limit check (moderate tier - transcript analysis)
    const rateLimitResponse = await withRateLimit(request, "moderate", "interviews/analyze");
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const { id: interviewId } = await params;
    const storage = getStorage();

    logger.info("Analyzing interview", {
      api: "interviews/[id]/analyze",
      operation: "analyze",
      interviewId,
    });

    // Get the interview
    const interview = await storage.getInterview(interviewId);
    if (!interview) {
      return NextResponse.json(
        { error: "Interview not found" },
        { status: 404 }
      );
    }

    // Get organization from job for quota check
    const job = await storage.getJob(interview.jobId);
    if (!job) {
      return NextResponse.json(
        { error: "Job not found for interview" },
        { status: 404 }
      );
    }
    const organizationId = job.organizationId;

    // Check quota before analysis
    const quotaResponse = await withQuota(organizationId, "interviews/analyze");
    if (quotaResponse) {
      return quotaResponse;
    }

    // Check if already has evaluation
    if (interview.aiEvaluation) {
      logger.info("Interview already has evaluation", {
        api: "interviews/[id]/analyze",
        operation: "analyze",
        interviewId,
      });
      return NextResponse.json({
        success: true,
        message: "Interview already has evaluation",
        interview,
      });
    }

    // Get the transcript
    const transcript = interview.transcript;
    if (!transcript || transcript.length === 0) {
      logger.warn("No transcript available for interview", {
        api: "interviews/[id]/analyze",
        operation: "analyze",
        interviewId,
      });

      return NextResponse.json(
        {
          error: "Missing transcript",
          message: "Cannot analyze interview without transcript. Please check if recording was successful.",
          interview,
        },
        { status: 422 }
      );
    }

    logger.info("Analyzing transcript", {
      api: "interviews/[id]/analyze",
      operation: "analyze",
      interviewId,
      transcriptLength: transcript.length,
    });

    // Generate AI evaluation using Gemini
    const prompt = `Analyze this interview transcript and provide an evaluation.

TRANSCRIPT:
${transcript}

Provide a JSON evaluation with:
- overallScore (0-100): Overall interview performance
- categories: { technicalKnowledge, problemSolving, communication, experienceRelevance } (each 0-100)
- strengths: Array of 2-4 specific strengths demonstrated
- improvements: Array of 2-4 areas for improvement
- summary: 2-3 sentence summary of the interview

Be fair but honest in your assessment. Base scores on what was actually discussed.`;

    try {
      const jsonSchema = z.toJSONSchema(EvaluationSchema);
      const response = await geminiClient.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ text: prompt }],
        config: {
          responseMimeType: "application/json",
          responseJsonSchema: jsonSchema as unknown as Record<string, unknown>,
        },
      });

      const parsed = JSON.parse(response.text || "{}");
      const evaluation = EvaluationSchema.parse(parsed);

      const aiEvaluation: AIEvaluation = {
        overallScore: evaluation.overallScore,
        categories: evaluation.categories,
        strengths: evaluation.strengths,
        improvements: evaluation.improvements,
        summary: evaluation.summary,
      };

      // Update interview with evaluation
      interview.aiEvaluation = aiEvaluation;
      interview.score = aiEvaluation.overallScore;
      interview.status = "COMPLETED";
      await storage.saveInterview(interviewId, interview);

      logger.info("AI evaluation generated", {
        api: "interviews/[id]/analyze",
        operation: "analyze",
        interviewId,
        score: aiEvaluation.overallScore,
      });

      // Track usage after successful evaluation
      await trackUsage(organizationId, "interviews/analyze");

      return NextResponse.json({
        success: true,
        message: "AI evaluation generated",
        interview,
      });
    } catch (aiError) {
      logger.error(aiError, {
        api: "interviews/[id]/analyze",
        operation: "generate-evaluation",
        interviewId,
      });

      return NextResponse.json(
        {
          error: "AI analysis failed",
          message: "Could not analyze interview. The AI service may be temporarily unavailable. Please try again later.",
          interview,
        },
        { status: 503 }
      );
    }
  } catch (error) {
    logger.error(error, {
      api: "interviews/[id]/analyze",
      operation: "analyze",
    });
    return NextResponse.json(
      { error: "Failed to analyze interview" },
      { status: 500 }
    );
  }
}
