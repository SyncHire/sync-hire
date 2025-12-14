import type { JDExtractionStateType } from "../state.js";
import { fileToGeminiPart } from "../utils/file-utils.js";
import { logger } from "../../utils/logger.js";

export async function documentLoaderNode(state: JDExtractionStateType): Promise<Partial<JDExtractionStateType>> {
  const { filePath, fileType } = state;

  logger.info("DocumentLoaderNode: Starting validation", { filePath });

  try {
    // We don't store the huge base64 in state, but we MUST verify we can read it.
    // Downstream nodes will call fileToGeminiPart themselves.
    // This node acts as a "Gatekeeper" to fail fast if IO is broken.
    const part = await fileToGeminiPart(filePath, fileType);
    
    // Naive page count estimation (since we don't use pdf-parse)
    // 1MB ~ 5 pages? It's just a rough heuristic for now, or just default to 1
    const sizeInBytes = part.inlineData.data.length * 0.75; // base64 overhead
    const estimatedPages = Math.max(1, Math.ceil(sizeInBytes / (1024 * 50))); // Assume 50kb avg page size with images

    logger.info("DocumentLoaderNode: Success", { estimatedPages });

    return {
      documentInfo: {
        pageCount: estimatedPages,
        isReadable: true
      }
    };
  } catch (error) {
    logger.error("DocumentLoaderNode: Critical IO Failure", { error });
    throw new Error(`Failed to load document: ${(error as Error).message}`);
  }
}
