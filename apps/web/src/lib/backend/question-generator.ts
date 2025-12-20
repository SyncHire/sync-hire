/**
 * Interview Question Generator
 *
 * Generates personalized interview questions using Gemini AI
 * based on candidate's CV and job description context.
 * Supports smart merging with existing job questions.
 */

import type { Schema } from "@google/genai";
import type { ExtractedCVData, ExtractedJobData } from "@sync-hire/database";
import { z } from "zod";
import { geminiClient } from "@/lib/gemini-client";
import type { Question } from "@/lib/types/interview-types";

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

// Schema for smart merge response
const smartMergeResponseSchema = z.object({
  keepQuestions: z
    .array(z.number())
    .describe("Indices of job questions to keep"),
  skipReasons: z
    .array(
      z.object({
        index: z.number(),
        reason: z.string(),
      }),
    )
    .describe("Reasons for skipping certain questions"),
  gapQuestions: z
    .array(suggestedQuestionSchema)
    .describe("New questions to fill gaps"),
});

export interface MergedQuestion extends SuggestedQuestion {
  source: "job" | "ai-personalized";
  originalId?: string;
}

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
  if (!cv?.experience || cv.experience.length === 0)
    return "No experience data";

  const totalYears = cv.experience.length; // Simplified calculation
  const recentRole = cv.experience[0];

  return `${totalYears}+ years of experience, recently: ${recentRole.title} at ${recentRole.company}`;
}

/**
 * Build Gemini prompt for personalized question generation
 */
function buildPrompt(
  cvData: ExtractedCVData | null,
  jdData: ExtractedJobData | null,
): string {
  const skills = extractTopSkills(cvData);
  const experience = extractExperienceSummary(cvData);
  const education = cvData?.education?.[0]?.degree || "Unknown";

  return `You are an expert technical interviewer creating personalized interview questions.

**Candidate Background (from CV):**
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

IMPORTANT: Do NOT include the candidate's name in any question. Use generic terms like "you", "your experience", etc.

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
  jdData: ExtractedJobData | null,
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
        responseJsonSchema: jsonSchema as unknown as Schema,
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
    }

    return validatedQuestions;
  } catch (error) {
    throw new Error(
      `Failed to generate interview questions: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Build prompt for smart merge question generation
 */
function buildSmartMergePrompt(
  cvData: ExtractedCVData | null,
  jdData: ExtractedJobData | null,
  jobQuestions: Question[],
): string {
  const skills = extractTopSkills(cvData);
  const experience = extractExperienceSummary(cvData);
  const education = cvData?.education?.[0]?.degree || "Unknown";

  const jobQuestionsText = jobQuestions
    .map((q, i) => `${i}. "${q.text}"`)
    .join("\n");

  return `You are an expert technical interviewer analyzing interview questions for a specific candidate.

**Candidate Background (from CV):**
- Name: ${cvData?.personalInfo?.fullName || "Unknown"}
- Experience: ${experience}
- Top Skills: ${skills.join(", ") || "Not specified"}
- Education: ${education}

**Job Position:**
- Title: ${jdData?.title || "Unknown"}
- Company: ${jdData?.company || "Unknown"}
- Required Skills: ${jdData?.requirements?.slice(0, 5).join(", ") || "Not specified"}
- Key Responsibilities: ${jdData?.responsibilities?.slice(0, 3).join(", ") || "Not specified"}

**Existing Job Questions:**
${jobQuestionsText || "No existing questions"}

**Your Task:**
1. Analyze which existing questions are RELEVANT for this specific candidate
2. Identify which questions to SKIP (redundant or not applicable given candidate's background)
3. Generate 2-3 NEW questions that address GAPS in the candidate's profile relative to job requirements

Return a JSON object with:
- keepQuestions: array of question indices (0-based) to keep from existing questions
- skipReasons: array of {index, reason} for questions being skipped
- gapQuestions: array of new questions to fill gaps, each with {content, reason, category}

Focus on:
- Keeping questions that probe areas where the candidate needs assessment
- Skipping questions about skills the candidate clearly has extensive experience in (ask deeper questions instead)
- Adding questions about skill gaps or areas not covered by existing questions

IMPORTANT: Do NOT include the candidate's name in any new question.`;
}

/**
 * Smart merge existing job questions with CV-specific gap questions
 * Returns a merged list with source tags
 */
export async function generateSmartMergedQuestions(
  cvData: ExtractedCVData | null,
  jdData: ExtractedJobData | null,
  jobQuestions: Question[],
): Promise<MergedQuestion[]> {
  // If no job questions, fall back to regular generation
  if (!jobQuestions || jobQuestions.length === 0) {
    const questions = await generateInterviewQuestions(cvData, jdData);
    return questions.map((q) => ({
      ...q,
      source: "ai-personalized" as const,
    }));
  }

  try {
    const prompt = buildSmartMergePrompt(cvData, jdData, jobQuestions);
    const jsonSchema = z.toJSONSchema(smartMergeResponseSchema);

    const response = await geminiClient.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: jsonSchema as unknown as Record<string, unknown>,
      },
    });

    const text = response.text || "";
    if (!text) {
      throw new Error("Empty response from Gemini");
    }

    const parsed = JSON.parse(text);
    const validated = smartMergeResponseSchema.parse(parsed);

    // Build merged question list
    const mergedQuestions: MergedQuestion[] = [];

    // Add kept job questions
    for (const index of validated.keepQuestions) {
      if (index >= 0 && index < jobQuestions.length) {
        const q = jobQuestions[index];
        mergedQuestions.push({
          content: q.text,
          reason: "Existing job question - relevant for candidate assessment",
          category: mapCategory(q.category),
          source: "job",
          originalId: q.id,
        });
      }
    }

    // Add gap questions
    for (const gapQ of validated.gapQuestions) {
      mergedQuestions.push({
        ...gapQ,
        source: "ai-personalized",
      });
    }

    // Log skip reasons for debugging
    if (validated.skipReasons.length > 0) {
    }

    return mergedQuestions;
  } catch (_error) {
    // Fallback: keep all job questions + generate new ones
    const newQuestions = await generateInterviewQuestions(cvData, jdData);

    const merged: MergedQuestion[] = jobQuestions.map((q) => ({
      content: q.text,
      reason: "Existing job question",
      category: mapCategory(q.category),
      source: "job" as const,
      originalId: q.id,
    }));

    // Add 2-3 AI questions
    for (const q of newQuestions.slice(0, 3)) {
      merged.push({
        ...q,
        source: "ai-personalized" as const,
      });
    }

    return merged;
  }
}

/**
 * Map interview stage to question category
 */
function mapCategory(
  stage: string | undefined,
): "technical" | "behavioral" | "experience" | "problem-solving" | undefined {
  if (!stage) return undefined;
  const lower = stage.toLowerCase();
  if (lower.includes("technical")) return "technical";
  if (lower.includes("behavioral")) return "behavioral";
  if (lower.includes("problem")) return "problem-solving";
  return "experience";
}
