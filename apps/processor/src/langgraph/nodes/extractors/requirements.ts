import { HumanMessage } from "@langchain/core/messages";
import type { JDExtractionStateType, ExtractionResult, Requirements } from "../../state.js";
import { fileToGeminiPart } from "../../utils/file-utils.js";
import { getStrictLLM, cleanJSON } from "../../utils/gemini.js";
import { logger } from "../../../utils/logger.js";
import { NodeEvaluationOutputSchema } from "@sync-hire/shared";
import { withRetry } from "../../utils/self-reflect.js";
import { z } from "zod";

const EXTRACTION_PROMPT = `You are a precise job description analyzer. Extract requirements and classify them into "required" (must-haves) and "preferred" (nice-to-haves).

Extract:
1. **Required**: Essential qualifications, years of experience, core skills, mandatory degrees.
2. **Preferred**: Bonus skills, "pluses", extra certifications, desirable but not mandatory traits.

Be precise. quote the text if possible but keep it concise.

Respond in this exact JSON format:
{
  "data": {
    "required": ["req1", "req2"],
    "preferred": ["pref1", "pref2"]
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
  data: z.object({
    required: z.array(z.string()),
    preferred: z.array(z.string()),
  }),
  evaluation: NodeEvaluationOutputSchema,
});

async function extractRequirements(
  filePath: string,
  fileType: string,
  hint?: string
): Promise<z.infer<typeof OutputSchema>> {
  const documentPart = await fileToGeminiPart(filePath, fileType);

  let prompt = EXTRACTION_PROMPT;
  if (hint) {
    prompt += `\n\nUser Hint: ${hint}`;
  }

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

  const llm = getStrictLLM();
  const response = await llm.invoke([message]);

  const responseText = typeof response.content === "string" 
    ? response.content 
    : JSON.stringify(response.content);
  
  const rawParsed = JSON.parse(cleanJSON(responseText), (key, value) => {
    return value === null ? undefined : value;
  });
  return OutputSchema.parse(rawParsed);
}

export async function requirementsExtractorNode(
  state: JDExtractionStateType
): Promise<Partial<JDExtractionStateType>> {
  const { filePath, fileType, hints } = state;

  logger.info("RequirementsExtractor: Starting extraction", { filePath });

  try {
    const resultWithRetry = await withRetry(
      () => extractRequirements(filePath, fileType, hints?.requirements),
      "RequirementsExtractor"
    );

    logger.info("RequirementsExtractor: Extraction complete", {
      reqCount: resultWithRetry.data.required.length,
      prefCount: resultWithRetry.data.preferred.length,
      relevanceScore: resultWithRetry.evaluation.relevanceScore,
    });

    const result: ExtractionResult<Requirements> = {
      data: resultWithRetry.data,
      evaluation: resultWithRetry.evaluation,
    };

    return { requirementsResult: result };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("RequirementsExtractor: Extraction failed", { error: errorMessage });

    const errorResult: ExtractionResult<Requirements> = {
      data: { required: [], preferred: [] },
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

    return { requirementsResult: errorResult };
  }
}
