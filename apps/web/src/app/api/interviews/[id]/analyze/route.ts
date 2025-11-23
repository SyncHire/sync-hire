/**
 * POST /api/interviews/[id]/analyze
 * Triggers AI analysis for an interview that is stuck or missing evaluation
 */
import { NextResponse } from "next/server";
import { getStorage } from "@/lib/storage/storage-factory";
import { geminiClient } from "@/lib/gemini-client";
import { z } from "zod";
import type { AIEvaluation } from "@/lib/mock-data";

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
      console.log(`⚠️ No transcript available for analysis`);
      // Generate placeholder evaluation if no transcript
      const placeholderEvaluation: AIEvaluation = {
        overallScore: 75,
        categories: {
          technicalKnowledge: 75,
          problemSolving: 75,
          communication: 75,
          experienceRelevance: 75,
        },
        strengths: [
          "Participated in AI interview",
          "Demonstrated interest in the role",
        ],
        improvements: [
          "Transcript not available for detailed analysis",
        ],
        summary: "Interview completed. Detailed analysis not available due to missing transcript.",
      };

      interview.aiEvaluation = placeholderEvaluation;
      interview.score = placeholderEvaluation.overallScore;
      interview.status = "COMPLETED";
      await storage.saveInterview(interviewId, interview);

      return NextResponse.json({
        success: true,
        message: "Placeholder evaluation created (no transcript)",
        interview,
      });
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

      // Fallback evaluation
      const fallbackEvaluation: AIEvaluation = {
        overallScore: 70,
        categories: {
          technicalKnowledge: 70,
          problemSolving: 70,
          communication: 70,
          experienceRelevance: 70,
        },
        strengths: [
          "Completed the interview process",
          "Engaged with interview questions",
        ],
        improvements: [
          "AI analysis temporarily unavailable",
        ],
        summary: "Interview completed successfully. Detailed AI analysis was not available at this time.",
      };

      interview.aiEvaluation = fallbackEvaluation;
      interview.score = fallbackEvaluation.overallScore;
      interview.status = "COMPLETED";
      await storage.saveInterview(interviewId, interview);

      return NextResponse.json({
        success: true,
        message: "Fallback evaluation applied",
        interview,
      });
    }
  } catch (error) {
    console.error("Error analyzing interview:", error);
    return NextResponse.json(
      { error: "Failed to analyze interview" },
      { status: 500 }
    );
  }
}
