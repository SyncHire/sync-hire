/**
 * POST /api/interviews/[id]/analyze
 * Triggers AI analysis for an interview that is stuck or missing evaluation
 */
import { NextResponse } from "next/server";
import { getStorage } from "@/lib/storage/storage-factory";
import { geminiClient } from "@/lib/gemini-client";
import { z } from "zod";
import type { AIEvaluation } from "@/lib/types/interview-types";

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
    const { id: interviewId } = await params;
    const storage = getStorage();

    console.log(`🔄 Analyzing interview: ${interviewId}`);

    // Get the interview
    const interview = await storage.getInterview(interviewId);
    if (!interview) {
      return NextResponse.json(
        { error: "Interview not found" },
        { status: 404 }
      );
    }

    // Check if already has evaluation
    if (interview.aiEvaluation) {
      console.log(`✅ Interview already has evaluation`);
      return NextResponse.json({
        success: true,
        message: "Interview already has evaluation",
        interview,
      });
    }

    // Get the transcript
    const transcript = interview.transcript;
    if (!transcript || transcript.length === 0) {
      console.error(`❌ No transcript available for interview: ${interviewId}`);

      // Don't change status - interview may still be in progress or pending
      // Just return error indicating transcript is not yet available
      return NextResponse.json(
        {
          error: "Missing transcript",
          message: "Cannot analyze interview without transcript. Please check if recording was successful.",
          interview,
        },
        { status: 422 } // Unprocessable Entity
      );
    }

    console.log(`📝 Analyzing transcript (${transcript.length} characters)...`);

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

      console.log(`✅ AI evaluation generated: ${aiEvaluation.overallScore}% overall`);

      return NextResponse.json({
        success: true,
        message: "AI evaluation generated",
        interview,
      });
    } catch (aiError) {
      console.error("❌ AI evaluation failed:", aiError);

      // Don't change status - analysis failure is retriable
      // Return error so caller can retry later
      return NextResponse.json(
        {
          error: "AI analysis failed",
          message: "Could not analyze interview. The AI service may be temporarily unavailable. Please try again later.",
          interview,
        },
        { status: 503 } // Service Unavailable
      );
    }
  } catch (error) {
    console.error("Error analyzing interview:", error);
    return NextResponse.json(
      { error: "Failed to analyze interview" },
      { status: 500 }
    );
  }
}
