import { HumanMessage } from "@langchain/core/messages";
import type { JDExtractionStateType, ExtractionResult, Skill } from "../../state.js";
import { fileToGeminiPart } from "../../utils/file-utils.js";
import { getCreativeLLM, cleanJSON } from "../../utils/gemini.js";
import { logger } from "../../../utils/logger.js";
import { NodeEvaluationOutputSchema } from "@sync-hire/shared";
import { withRetry } from "../../utils/self-reflect.js";
import { z } from "zod";

const EXTRACTION_PROMPT = `You are a skilled job description analyzer specializing in skill extraction. Extract ALL skills mentioned in the document, including:

1. **Technical Skills**: Programming languages, frameworks, tools, platforms
2. **Soft Skills**: Communication, leadership, teamwork, problem-solving
3. **Domain Skills**: Industry-specific knowledge, methodologies
4. **Certifications**: Any mentioned certifications or qualifications

Be thorough but avoid duplicates. Normalize skill names (e.g., "JS" -> "JavaScript").

Respond in this exact JSON format:
{
  "data": ["skill1", "skill2", "skill3"],
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
  data: z.array(z.string()),
  evaluation: NodeEvaluationOutputSchema,
});

async function extractSkills(
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

  const llm = getCreativeLLM();
  const response = await llm.invoke([message]);

  const responseText = typeof response.content === "string" 
    ? response.content 
    : JSON.stringify(response.content);
  
  const rawParsed = JSON.parse(cleanJSON(responseText), (key, value) => {
    return value === null ? undefined : value;
  });
  return OutputSchema.parse(rawParsed);
}

export async function skillsExtractorNode(
  state: JDExtractionStateType
): Promise<Partial<JDExtractionStateType>> {
  const { filePath, fileType, hints } = state;

  logger.info("SkillsExtractor: Starting extraction", { filePath });

  try {
    const resultWithRetry = await withRetry(
      () => extractSkills(filePath, fileType, hints?.skills),
      "SkillsExtractor"
    );

    logger.info("SkillsExtractor: Extraction complete", {
      skillCount: resultWithRetry.data.length,
      relevanceScore: resultWithRetry.evaluation.relevanceScore,
    });

    const result: ExtractionResult<Skill[]> = {
      data: resultWithRetry.data,
      evaluation: resultWithRetry.evaluation,
    };

    return { skillsResult: result };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("SkillsExtractor: Extraction failed", { error: errorMessage });

    const errorResult: ExtractionResult<Skill[]> = {
      data: [],
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

    return { skillsResult: errorResult };
  }
}
