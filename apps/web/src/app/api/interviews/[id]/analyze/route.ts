/**
 * POST /api/interviews/[id]/analyze
 * Triggers AI analysis for an interview that is stuck or missing evaluation.
 * Access: HR only (organization members)
 */

import { z } from "zod";
import { trackUsage } from "@/lib/ai-usage-tracker";
import { errors, successResponse } from "@/lib/api-response";
import { withInterviewAccess } from "@/lib/auth-middleware";
import { geminiClient } from "@/lib/gemini-client";
import { logger } from "@/lib/logger";
import { withRateLimit } from "@/lib/rate-limiter";
import { getStorage } from "@/lib/storage/storage-factory";
import type { AIEvaluation } from "@/lib/types/interview-types";
import { withQuota } from "@/lib/with-quota";

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
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: interviewId } = await params;

    // Verify HR access (org member only, not candidates)
    const { response, jobOrgId } = await withInterviewAccess(interviewId);
    if (response) {
      return response;
    }

    // Rate limit check (moderate tier - transcript analysis)
    const rateLimitResponse = await withRateLimit(
      request,
      "moderate",
      "interviews/analyze",
    );
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const storage = getStorage();

    logger.info("Analyzing interview", {
      api: "interviews/[id]/analyze",
      operation: "analyze",
      interviewId,
    });

    // Get the interview
    const interview = await storage.getInterview(interviewId);
    if (!interview) {
      return errors.notFound("Interview");
    }

    // Get organization from job for quota check
    const job = await storage.getJob(interview.jobId);
    if (!job) {
      return errors.notFound("Job");
    }
    const organizationId = jobOrgId ?? job.organizationId;

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
      return successResponse({
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

      return errors.validation("Cannot analyze interview without transcript", [
        {
          field: "transcript",
          message:
            "Missing transcript. Please check if recording was successful.",
        },
      ]);
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
      const geminiResponse = await geminiClient.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ text: prompt }],
        config: {
          responseMimeType: "application/json",
          responseJsonSchema: jsonSchema as unknown as Record<string, unknown>,
        },
      });

      const parsed = JSON.parse(geminiResponse.text || "{}");
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

      return successResponse({
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

      return errors.internal(
        "AI analysis failed. The service may be temporarily unavailable.",
      );
    }
  } catch (error) {
    logger.error(error, {
      api: "interviews/[id]/analyze",
      operation: "analyze",
    });
    return errors.internal("Failed to analyze interview");
  }
}
