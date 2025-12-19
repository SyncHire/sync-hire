/**
 * POST /api/jobs/generate-questions
 *
 * Generate AI interview questions for a job based on title, description, and requirements.
 */

import { type NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { geminiClient } from "@/lib/gemini-client";
import { withRateLimit } from "@/lib/rate-limiter";
import { withQuota } from "@/lib/with-quota";
import { trackUsage } from "@/lib/ai-usage-tracker";
import { getStorage } from "@/lib/storage/storage-factory";

const requestSchema = z.object({
  jobId: z.string(),
  title: z.string(),
  description: z.string().optional(),
  requirements: z.array(z.string()).optional(),
});

const questionsSchema = z.object({
  questions: z.array(
    z.object({
      content: z.string().describe("The interview question"),
      reason: z.string().describe("Why this question is relevant"),
    })
  ),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limit check (moderate tier - single Gemini call)
    const rateLimitResponse = await withRateLimit(request, "moderate", "jobs/generate-questions");
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const body = await request.json();
    const { jobId, title, description, requirements } = requestSchema.parse(body);

    // Get organization from job for quota check
    const storage = getStorage();
    const job = await storage.getJob(jobId);
    if (!job) {
      return NextResponse.json(
        { success: false, error: "Job not found" },
        { status: 404 }
      );
    }
    const organizationId = job.organizationId;

    // Check quota before generating questions
    const quotaResponse = await withQuota(organizationId, "jobs/generate-questions");
    if (quotaResponse) {
      return quotaResponse;
    }

    const jobContext = `
Job Title: ${title}
${description ? `Description: ${description}` : ""}
${requirements?.length ? `Requirements:\n${requirements.map((r) => `- ${r}`).join("\n")}` : ""}
    `.trim();

    const prompt = `Generate 5-7 interview questions for this job position. These questions will be asked by an AI interviewer during a video interview session.

Focus on:
1. Technical skills assessment
2. Problem-solving abilities
3. Experience and past projects
4. Cultural fit and communication
5. Career goals and motivation

${jobContext}

Return a JSON object with a "questions" array. Each question should have:
- "content": The exact question to ask (conversational tone)
- "reason": Brief explanation of why this question is relevant

IMPORTANT: Do not include the candidate's name in any question. Keep questions professional and focused on the role.`;

    const jsonSchema = z.toJSONSchema(questionsSchema);

    const response = await geminiClient.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ text: prompt }],
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: jsonSchema as any,
      },
    });

    const content = response.text || "";
    const parsed = JSON.parse(content);
    const validated = questionsSchema.parse(parsed);

    // Track usage after successful generation
    await trackUsage(organizationId, "jobs/generate-questions");

    return NextResponse.json({
      success: true,
      data: validated,
    });
  } catch (error) {
    logger.error(error, { api: "jobs/generate-questions", operation: "generate" });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate questions",
      },
      { status: 500 }
    );
  }
}
