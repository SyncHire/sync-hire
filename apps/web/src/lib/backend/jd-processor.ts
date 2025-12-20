/**
 * Job Description Processor
 *
 * Handles PDF extraction and AI-powered structured extraction using Gemini.
 * Uses @google/genai with inline PDF data for direct document processing.
 * Implements structured output with Zod schemas.
 */

import type { ExtractedJobData } from "@sync-hire/database";
import { z } from "zod";
import { geminiClient } from "@/lib/gemini-client";
import type { CloudStorageProvider } from "@/lib/storage/cloud/cloud-storage-provider";
import type { StorageInterface } from "@/lib/storage/storage-interface";
import { generateFileHash } from "@/lib/utils/hash-utils";

// Valid employment types for the database
const EMPLOYMENT_TYPES = [
  "Full-time",
  "Part-time",
  "Contract",
  "Internship",
] as const;
// Valid work arrangements for the database
const WORK_ARRANGEMENTS = ["On-site", "Remote", "Hybrid"] as const;

// Define Zod schema for extracted job data with enum constraints
const extractedJobDataSchema = z.object({
  title: z.string().describe("The job title or position name"),
  company: z.string().describe("The company or organization name"),
  responsibilities: z
    .array(z.string())
    .describe("List of key job responsibilities and duties"),
  requirements: z
    .array(z.string())
    .describe("List of required skills, qualifications, and experience"),
  seniority: z
    .string()
    .describe(
      "Seniority level (e.g., Junior, Mid-level, Senior, Staff, Principal)",
    ),
  location: z.string().describe("Job location (city, state/country)"),
  employmentType: z
    .enum(EMPLOYMENT_TYPES)
    .describe(
      "Employment type - must be one of: Full-time, Part-time, Contract, Internship",
    ),
  workArrangement: z
    .enum(WORK_ARRANGEMENTS)
    .describe("Work arrangement - must be one of: On-site, Remote, Hybrid"),
});

// Define Zod schema for combined AI generation (suggestions + questions)
const aiContentSchema = z.object({
  suggestions: z.array(
    z.object({
      original: z.string().describe("The original text being improved"),
      improved: z.string().describe("The improved version of the text"),
    }),
  ),
  questions: z.array(
    z.object({
      content: z
        .string()
        .describe("The question text that AI will ask candidates"),
      reason: z
        .string()
        .describe("Why this question is relevant for the position"),
    }),
  ),
});

export class JobDescriptionProcessor {
  constructor(
    private storage: StorageInterface,
    private cloudStorage: CloudStorageProvider,
  ) {}

  /**
   * Process a file (PDF, Markdown, or Text) and extract structured job data
   * @param buffer - File content
   * @param fileName - Original file name
   * @param organizationId - Organization ID to associate with the job
   * @param createdById - User ID who created this extraction
   */
  async processFile(
    buffer: Buffer,
    fileName: string,
    organizationId: string,
    createdById: string,
  ): Promise<{
    hash: string;
    extractedData: ExtractedJobData;
    aiSuggestions: Array<{
      original: string;
      improved: string;
    }>;
    aiQuestions: Array<{
      content: string;
      reason: string;
    }>;
    cached: boolean;
  }> {
    // Validate file type
    const ext = fileName.toLowerCase().split(".").pop();
    const supportedTypes = ["pdf", "md", "txt"];
    if (!ext || !supportedTypes.includes(ext)) {
      throw new Error(
        `Unsupported file type: ${ext}. Supported: PDF, Markdown (.md), Text (.txt)`,
      );
    }

    // Generate hash for deduplication
    const hash = generateFileHash(buffer);

    // Check if already cached
    const cached = await this.storage.hasExtraction(hash);
    if (cached) {
      const extractedData = await this.storage.getExtraction(hash);
      if (extractedData) {
        // Generate AI content (suggestions + questions) for cached data
        const { aiSuggestions, aiQuestions } =
          await this.generateAIContent(extractedData);
        return {
          hash,
          extractedData,
          aiSuggestions,
          aiQuestions,
          cached: true,
        };
      }
    }

    // Extract structured data based on file type
    const isTextBased = ext === "md" || ext === "txt";
    const extractedData = isTextBased
      ? await this.extractStructuredDataFromText(buffer.toString("utf-8"))
      : await this.extractStructuredData(buffer);
    const { aiSuggestions, aiQuestions } =
      await this.generateAIContent(extractedData);

    // Save to cache
    await this.storage.saveExtraction(
      hash,
      extractedData,
      organizationId,
      createdById,
    );

    // Upload original file to cloud storage
    await this.cloudStorage.uploadJobDescription(hash, buffer);

    return { hash, extractedData, aiSuggestions, aiQuestions, cached: false };
  }

  /**
   * Extract structured data from PDF using Gemini
   */
  private async extractStructuredData(
    buffer: Buffer,
  ): Promise<ExtractedJobData> {
    try {
      const base64Data = buffer.toString("base64");

      // Extract structured data
      const jsonSchema = z.toJSONSchema(extractedJobDataSchema);
      const structuredResponse = await geminiClient.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            text: `Extract structured job information from the provided PDF job description. You MUST return a valid JSON object with these exact fields:
- title: string
- company: string
- responsibilities: array of strings
- requirements: array of strings
- seniority: string (e.g., Junior, Mid-level, Senior, Staff, Principal)
- location: string (city, state/country)
- employmentType: MUST be one of: "Full-time", "Part-time", "Contract", "Internship"
- workArrangement: MUST be one of: "On-site", "Remote", "Hybrid"

All fields must be present. Default to "Full-time" for employmentType and "On-site" for workArrangement if not clearly stated.`,
          },
          {
            inlineData: {
              mimeType: "application/pdf",
              data: base64Data,
            },
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseJsonSchema: jsonSchema as any,
        },
      });

      const structuredContent = structuredResponse.text || "";

      const structuredParsed = JSON.parse(structuredContent);

      const extractedData = extractedJobDataSchema.parse(structuredParsed);

      return extractedData;
    } catch (_error) {
      return {
        title: "",
        company: "",
        responsibilities: [],
        requirements: [],
        seniority: "",
        location: "",
        employmentType: "Full-time",
        workArrangement: "On-site",
      };
    }
  }

  /**
   * Extract structured data from text/markdown content using Gemini
   */
  private async extractStructuredDataFromText(
    textContent: string,
  ): Promise<ExtractedJobData> {
    try {
      const jsonSchema = z.toJSONSchema(extractedJobDataSchema);
      const structuredResponse = await geminiClient.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            text: `Extract structured job information from the following job description text. You MUST return a valid JSON object with these exact fields:
- title: string
- company: string
- responsibilities: array of strings
- requirements: array of strings
- seniority: string (e.g., Junior, Mid-level, Senior, Staff, Principal)
- location: string (city, state/country)
- employmentType: MUST be one of: "Full-time", "Part-time", "Contract", "Internship"
- workArrangement: MUST be one of: "On-site", "Remote", "Hybrid"

All fields must be present. Default to "Full-time" for employmentType and "On-site" for workArrangement if not clearly stated.

JOB DESCRIPTION:
${textContent}`,
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseJsonSchema: jsonSchema as any,
        },
      });

      const structuredContent = structuredResponse.text || "";

      const structuredParsed = JSON.parse(structuredContent);

      const extractedData = extractedJobDataSchema.parse(structuredParsed);

      return extractedData;
    } catch (_error) {
      return {
        title: "",
        company: "",
        responsibilities: [],
        requirements: [],
        seniority: "",
        location: "",
        employmentType: "Full-time",
        workArrangement: "On-site",
      };
    }
  }

  /**
   * Generate AI content (suggestions + questions) in a single API call for better efficiency
   */
  private async generateAIContent(extractedData: ExtractedJobData): Promise<{
    aiSuggestions: Array<{
      original: string;
      improved: string;
    }>;
    aiQuestions: Array<{
      content: string;
      reason: string;
    }>;
  }> {
    try {
      const jobDescription = `
Title: ${extractedData.title}
Responsibilities:
${extractedData.responsibilities.map((r) => `- ${r}`).join("\n")}
Requirements:
${extractedData.requirements.map((r) => `- ${r}`).join("\n")}
Seniority: ${extractedData.seniority}
Location: ${extractedData.location}
Employment Type: ${extractedData.employmentType}
Work Arrangement: ${extractedData.workArrangement}
      `.trim();

      const prompt = `Based on this job description, generate AI content to help improve the job posting and create interview questions.

PART 1 - JOB SUGGESTIONS:
Analyze the job description and suggest 3-5 improvements to make it clearer, more inclusive, and better aligned with the position requirements.

PART 2 - INTERVIEW QUESTIONS:
Generate 5-8 relevant interview questions that an AI will ask candidates. These should be conversational questions that help assess:
1. Technical skills and experience
2. Problem-solving abilities
3. Cultural fit and communication
4. Career goals and motivation
5. Relevant past experience

CRITICAL: You MUST return a valid JSON object with this EXACT structure:
{
  "suggestions": [
    {
      "original": "The original text from the job description",
      "improved": "The improved version of the text"
    }
  ],
  "questions": [
    {
      "content": "The exact question the AI will ask the candidate",
      "reason": "Why this question is relevant for this position"
    }
  ]
}

Job Description:
${jobDescription}

Return ONLY valid JSON in the exact format shown above. All arrays must contain at least one item. Each object must have all required fields.`;
      const jsonSchema = z.toJSONSchema(aiContentSchema);

      const response = await geminiClient.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ text: prompt }],
        config: {
          responseMimeType: "application/json",
          responseJsonSchema: jsonSchema as any,
        },
      });

      const content = response.text || "";

      // Try to parse JSON with multiple fallback strategies
      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch (_parseError) {
        // Try to extract JSON from response if it contains extra text
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error(
            "Could not parse JSON from response - no valid JSON found",
          );
        }
      }
      const validated = aiContentSchema.parse(parsed);

      return {
        aiSuggestions: validated.suggestions,
        aiQuestions: validated.questions,
      };
    } catch (_error) {
      // Return fallback content
      return {
        aiSuggestions: [
          {
            original:
              extractedData.responsibilities[0] || "Current responsibilities",
            improved:
              "Enhanced responsibility description with specific daily tasks and outcomes",
          },
          {
            original: extractedData.requirements[0] || "Current requirements",
            improved:
              "Detailed technical requirements with specific years of experience and proficiency levels",
          },
        ],
        aiQuestions: [
          {
            content:
              "Can you tell me about your experience with the technologies mentioned in this role?",
            reason: "Helps assess technical skills and experience level",
          },
          {
            content:
              "What interests you most about this position and our company?",
            reason: "Evaluates motivation and cultural fit",
          },
          {
            content:
              "Describe a challenging project you've worked on and how you approached it?",
            reason: "Assesses problem-solving and project management skills",
          },
        ],
      };
    }
  }
}
