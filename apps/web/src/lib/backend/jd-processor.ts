/**
 * Job Description Processor
 *
 * Handles PDF extraction and AI-powered structured extraction using Gemini.
 * Uses @google/genai with inline PDF data for direct document processing.
 * Implements structured output with Zod schemas.
 */

import type { ExtractedJobData } from "@/lib/mock-data";
import type { StorageInterface } from "@/lib/storage/storage-interface";
import { generateFileHash } from "@/lib/utils/hash-utils";
import { geminiClient } from "@/lib/gemini-client";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

// Define Zod schema for extracted job data
const extractedJobDataSchema = z.object({
  title: z
    .string()
    .describe("The job title or position name"),
  responsibilities: z
    .array(z.string())
    .describe("List of key job responsibilities and duties"),
  requirements: z
    .array(z.string())
    .describe("List of required skills, qualifications, and experience"),
  seniority: z
    .string()
    .describe("Seniority level (e.g., Junior, Mid-level, Senior, Staff, Principal)"),
  location: z
    .string()
    .describe("Job location or Remote if work-from-home"),
  employmentType: z
    .string()
    .describe("Employment type (e.g., Full-time, Part-time, Contract, Temporary)"),
});

export class JobDescriptionProcessor {
  constructor(private storage: StorageInterface) {}

  /**
   * Process a PDF file and extract structured job data
   */
  async processFile(buffer: Buffer, fileName: string): Promise<{
    hash: string;
    extractedData: ExtractedJobData;
    cached: boolean;
  }> {
    // Validate PDF file type
    const ext = fileName.toLowerCase().split(".").pop();
    if (ext !== "pdf") {
      throw new Error(`Unsupported file type: ${ext}. Only PDF files are supported.`);
    }

    // Generate hash for deduplication
    const hash = generateFileHash(buffer);

    // Check if already cached
    const cached = await this.storage.hasExtraction(hash);
    if (cached) {
      const extractedData = await this.storage.getExtraction(hash);
      if (extractedData) {
        return { hash, extractedData, cached: true };
      }
    }

    // Call Gemini API with PDF buffer for structured extraction
    const extractedData = await this.callGeminiAPI(buffer);

    // Save to cache
    await this.storage.saveExtraction(hash, extractedData);

    // Save original file
    await this.storage.saveUpload(hash, buffer);

    return { hash, extractedData, cached: false };
  }

  /**
   * Call Gemini API for structured job data extraction using inline PDF data
   * Uses Zod schema for structured output validation
   */
  private async callGeminiAPI(buffer: Buffer): Promise<ExtractedJobData> {
    try {
      const prompt = `Extract structured job information from the provided PDF job description. Return a JSON object with the following fields: title, responsibilities (array), requirements (array), seniority, location, and employmentType.`;

      // Convert PDF buffer to base64 for inline data
      const base64Data = buffer.toString("base64");

      // Convert Zod schema to JSON Schema
      const jsonSchema = zodToJsonSchema(extractedJobDataSchema as any);

      // Send PDF directly to Gemini with structured output using Zod schema
      const response = await geminiClient.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          { text: prompt },
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

      const content = response.text || "";

      // Parse and validate response with Zod
      const parsed = JSON.parse(content);
      const validated = extractedJobDataSchema.parse(parsed);

      return validated;
    } catch (error) {
      console.error("Gemini API error:", error);
      // Return empty extraction on failure (user can edit)
      return {
        title: "",
        responsibilities: [],
        requirements: [],
        seniority: "",
        location: "",
        employmentType: "",
      };
    }
  }
}
