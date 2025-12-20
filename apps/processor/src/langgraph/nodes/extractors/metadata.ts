import { HumanMessage } from "@langchain/core/messages";
import type { JDExtractionStateType, ExtractionResult } from "../../state.js";
import { fileToGeminiPart } from "../../utils/file-utils.js";
import { getStrictLLM, cleanJSON } from "../../utils/gemini.js";
import { logger } from "../../../utils/logger.js";
import { ExtractedJobDataSchema, NodeEvaluationOutputSchema } from "@sync-hire/shared";
import { withRetry } from "../../utils/self-reflect.js";
import { formatError } from "../../utils/error-utils.js";
import { z } from "zod";

const EXTRACTION_PROMPT = `You are a precise job description analyzer. Extract ONLY the following metadata from the document. Do not guess or infer missing information.

Extract:
- title: The job title
- company: The company name
- location: Work location (city, country, or "Remote")
- salary: Salary information if explicitly stated (min, max, currency, period)
- employmentType: One of "full-time", "part-time", "contract", "internship", or null
- workArrangement: One of "remote", "hybrid", "onsite", or null
- description: A brief summary of the role (2-3 sentences max)

For each field, also assess:
- relevanceScore: 0.0-1.0 indicating how confident you are in this extraction
- groundingEvidence: Quote the exact text that supports your extraction
- inferredFields: List any fields you had to guess (these should have lower scores)

Respond in this exact JSON format:
{
  "data": {
    "title": "string",
    "company": "string",
    "location": "string or null",
    "salary": { "min": number, "max": number, "currency": "string", "period": "year|month|hour" } or null,
    "employmentType": "string or null",
    "workArrangement": "string or null",
    "description": "string"
  },
  "evaluation": {
    "relevanceScore": 0.0-1.0,
    "confidenceScore": 0.0-1.0,
    "groundingScore": 0.0-1.0,
    "completenessScore": 0.0-1.0,
    "issues": ["string"],
    "warnings": ["string"]
  }
}`;

const OutputSchema = z.object({
  data: ExtractedJobDataSchema.partial(),
  evaluation: NodeEvaluationOutputSchema,
});

async function extractMetadata(
  filePath: string,
  fileType: string,
  hint?: string
): Promise<z.infer<typeof OutputSchema>> {
  // Load the file as a Gemini Part
  const documentPart = await fileToGeminiPart(filePath, fileType);

  // Build prompt with optional user hints
  let prompt = EXTRACTION_PROMPT;
  if (hint) {
    prompt += `\n\nUser Hint: ${hint}`;
  }

  // Create multimodal message
  const message = new HumanMessage({
    content: [
      { type: "text", text: prompt },
      {
        type: "media",
        mimeType: fileType,
        data: documentPart.inlineData.data,
      },
    ],
  });

  // Call LLM
  const llm = getStrictLLM();
  const response = await llm.invoke([message]);

  // Parse response
  const responseText = typeof response.content === "string" 
    ? response.content 
    : JSON.stringify(response.content);
  
  // Fix 1: Unsafe JSON Parsing -> Zod Validation + Markdown Clean + Null Handling
  const rawParsed = JSON.parse(cleanJSON(responseText), (key, value) => {
    return value === null ? undefined : value;
  });
  return OutputSchema.parse(rawParsed);
}

export async function metadataExtractorNode(
  state: JDExtractionStateType
): Promise<Partial<JDExtractionStateType>> {
  const { filePath, fileType, hints } = state;

  logger.info("MetadataExtractor: Starting extraction", { filePath });

  try {
    const resultWithRetry = await withRetry(
      () => extractMetadata(filePath, fileType, hints?.metadata),
      "MetadataExtractor"
    );

    logger.info("MetadataExtractor: Extraction complete", {
      relevanceScore: resultWithRetry.evaluation.relevanceScore,
    });

    const result: ExtractionResult<Partial<z.infer<typeof ExtractedJobDataSchema>>> = {
      data: resultWithRetry.data,
      evaluation: resultWithRetry.evaluation,
    };

    return { metadataResult: result };
  } catch (error) {
    // Fix: Friendly Error Formatting
    const errorMessage = formatError(error);
    logger.error("MetadataExtractor: Extraction failed", { error: errorMessage });

    // Return error result instead of throwing (partial failure support)
    const errorResult: ExtractionResult<Partial<z.infer<typeof ExtractedJobDataSchema>>> = {
      data: {},
      evaluation: {
        relevanceScore: 0,
        confidenceScore: 0,
        groundingScore: 0,
        completenessScore: 0,
        issues: [errorMessage],
        warnings: [],
      },
      error: errorMessage,
    };

    return { metadataResult: errorResult };
  }
}
