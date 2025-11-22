/**
 * Interview Question Generator
 *
 * Generates personalized interview questions using Gemini AI
 * based on candidate's CV and job description context.
 */

import { geminiClient } from "@/lib/gemini-client";
import { z } from "zod";
import type { ExtractedCVData, ExtractedJobData } from "@/lib/mock-data";

// Zod schema for suggested question response validation
const suggestedQuestionSchema = z.object({
  content: z.string().describe("The question text"),
  reason: z.string().describe("Why this question is relevant"),
  category: z
    .enum(["technical", "behavioral", "experience", "problem-solving"])
    .optional()
    .describe("Question category"),
});

const questionsResponseSchema = z.array(suggestedQuestionSchema);

export type SuggestedQuestion = z.infer<typeof suggestedQuestionSchema>;

/**
 * Extract top skills from CV data
 */
function extractTopSkills(cv: ExtractedCVData | null): string[] {
  if (!cv?.skills) return [];
  // Get top 10 skills
  return cv.skills.slice(0, 10);
}

/**
 * Extract experience summary from CV
 */
function extractExperienceSummary(cv: ExtractedCVData | null): string {
  if (!cv?.experience || cv.experience.length === 0) return "No experience data";

  const totalYears = cv.experience.length; // Simplified calculation
  const recentRole = cv.experience[0];

  return `${totalYears}+ years of experience, recently: ${recentRole.title} at ${recentRole.company}`;
}

/**
 * Build Gemini prompt for personalized question generation
 */
function buildPrompt(
  cvData: ExtractedCVData | null,
  jdData: ExtractedJobData | null
): string {
  const candidateName = cvData?.personalInfo.fullName || "Unknown";
  const skills = extractTopSkills(cvData);
  const experience = extractExperienceSummary(cvData);
  const education = cvData?.education?.[0]?.degree || "Unknown";

  return `You are an expert technical interviewer creating personalized interview questions.

**Candidate Background (from CV):**
- Name: ${candidateName}
- Experience: ${experience}
- Top Skills: ${skills.join(", ") || "Not specified"}
- Education: ${education}

**Job Position:**
- Title: ${jdData?.title || "Unknown"}
- Company: ${jdData?.company || "Unknown"}
- Required Skills: ${jdData?.requirements.slice(0, 5).join(", ") || "Not specified"}
- Key Responsibilities: ${jdData?.responsibilities.slice(0, 3).join(", ") || "Not specified"}
- Seniority Level: ${jdData?.seniority || "Not specified"}

Generate exactly 6-8 interview questions that:
1. Assess the candidate's fit for this specific role
2. Leverage their background and experience
3. Cover both technical skills and behavioral aspects
4. Are open-ended to encourage detailed responses
5. Range from easy to challenging

Return a JSON array with this structure:
[
  {
    "content": "Question text here?",
    "reason": "Why this question is relevant to the role",
    "category": "technical|behavioral|experience|problem-solving"
  }
]

Return ONLY valid JSON array, no additional text.`;
}

/**
 * Generate interview questions using Gemini AI
 */
export async function generateInterviewQuestions(
  cvData: ExtractedCVData | null,
  jdData: ExtractedJobData | null
): Promise<SuggestedQuestion[]> {
  try {
    const prompt = buildPrompt(cvData, jdData);
    const jsonSchema = z.toJSONSchema(questionsResponseSchema);

    const response = await geminiClient.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: jsonSchema as any,
      },
    });

    const text = response.text || "";
    if (!text) {
      throw new Error("Empty response from Gemini");
    }

    // Parse and validate JSON response
    let jsonResponse: unknown;
    try {
      jsonResponse = JSON.parse(text);
    } catch {
      // Try extracting JSON from response if it contains extra text
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("Could not parse JSON from Gemini response");
      }
      jsonResponse = JSON.parse(jsonMatch[0]);
    }

    // Validate response against schema
    const validatedQuestions = questionsResponseSchema.parse(jsonResponse);

    // Ensure we have 6-8 questions
    if (validatedQuestions.length < 6 || validatedQuestions.length > 8) {
      console.warn(
        `Expected 6-8 questions, got ${validatedQuestions.length}. Returning as-is.`
      );
    }

    return validatedQuestions;
  } catch (error) {
    console.error("Failed to generate interview questions:", error);
    throw new Error(
      `Failed to generate interview questions: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
