/**
 * Suggestion Processor
 *
 * Generates AI-powered suggestions for improving job descriptions.
 * Implements structured output with Zod schemas.
 */

import type { JDSuggestion, SuggestionResponse } from "@/lib/mock-data";
import { generateStringHash } from "@/lib/utils/hash-utils";
import type { StorageInterface } from "@/lib/storage/storage-interface";
import { geminiClient } from "@/lib/gemini-client";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

// Simple in-memory cache for suggestions
const suggestionsCache: Record<string, SuggestionResponse> = {};

// Define Zod schema for suggestions
const suggestionSchema = z.object({
  category: z
    .enum(["inclusiveness", "clarity", "skills", "seniority"])
    .describe("Category of suggestion"),
  text: z
    .string()
    .describe("Brief description of the suggestion"),
  original: z
    .string()
    .describe("Original text from job description"),
  improved: z
    .string()
    .describe("Improved version of the text"),
  tag: z
    .string()
    .describe("Display tag for the suggestion"),
});

const suggestionsArraySchema = z.array(suggestionSchema);

export class SuggestionProcessor {
  constructor(private storage: StorageInterface) {}

  /**
   * Generate suggestions for improving a job description
   */
  async generateSuggestions(jobDescription: string): Promise<SuggestionResponse> {
    const hash = generateStringHash(jobDescription);

    // Check cache first
    if (suggestionsCache[hash]) {
      return suggestionsCache[hash];
    }

    // Generate suggestions via Gemini
    const suggestions = await this.callGeminiAPI(jobDescription);

    // Cache result
    const response: SuggestionResponse = {
      id: hash,
      suggestions,
      cached: false,
    };
    suggestionsCache[hash] = response;

    return response;
  }

  /**
   * Call Gemini API to generate suggestions
   * Uses Zod schema for structured output validation
   */
  private async callGeminiAPI(jobDescription: string): Promise<JDSuggestion[]> {
    try {
      const prompt = `Analyze the following job description and provide 3-5 improvement suggestions. For each suggestion, categorize it as one of: inclusiveness (more inclusive/gender-neutral language), clarity (improved readability), skills (better technical alignment), or seniority (appropriate level expectations).

Job Description:
${jobDescription}`;

      // Convert Zod schema to JSON Schema
      const jsonSchema = zodToJsonSchema(suggestionsArraySchema as any);

      const response = await geminiClient.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ text: prompt }],
        config: {
          responseMimeType: "application/json",
          responseJsonSchema: jsonSchema as any,
        },
      });
      const content = response.text || "";

      // Parse and validate response with Zod
      const parsed = JSON.parse(content);
      const validated = suggestionsArraySchema.parse(parsed);

      // Convert to JDSuggestion format with IDs
      return validated.map((s, index): JDSuggestion => ({
        id: `suggestion-${index}`,
        category: s.category,
        text: s.text,
        original: s.original,
        improved: s.improved,
        tag: s.tag,
        accepted: false,
      }));
    } catch (error) {
      console.error("Suggestion API error:", error);
      return [];
    }
  }

  /**
   * Get display tag for suggestion category
   */
  private getCategoryTag(category: string): string {
    const tagMap: Record<string, string> = {
      inclusiveness: "More Inclusive",
      clarity: "Increased Clarity",
      skills: "Better Skills",
      seniority: "Seniority Match",
    };
    return tagMap[category] || "Improvement";
  }
}
