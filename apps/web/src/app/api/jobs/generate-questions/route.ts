/**
 * POST /api/jobs/generate-questions
 *
 * Generate AI interview questions for a job based on title, description, and requirements.
 */

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { geminiClient } from "@/lib/gemini-client";

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
    const body = await request.json();
    const { title, description, requirements } = requestSchema.parse(body);

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

    return NextResponse.json({
      success: true,
      data: validated,
    });
  } catch (error) {
    console.error("Generate questions error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate questions",
      },
      { status: 500 }
    );
  }
}
