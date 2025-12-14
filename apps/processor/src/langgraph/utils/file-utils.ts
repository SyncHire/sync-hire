import fs from "fs/promises";
import { logger } from "../../utils/logger.js";

interface GeminiPart {
  inlineData: {
    data: string;
    mimeType: string;
  };
}

const SUPPORTED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/plain",
  "text/markdown"
] as const;

export async function fileToGeminiPart(filePath: string, mimeType: string): Promise<GeminiPart> {
  try {
    // 1. Validate File Existence
    await fs.access(filePath);
    
    // 2. Validate MIME Type
    if (!SUPPORTED_MIME_TYPES.includes(mimeType as any)) {
      throw new Error(`Unsupported MIME type: ${mimeType}. Supported: ${SUPPORTED_MIME_TYPES.join(", ")}`);
    }

    // 3. Read File
    const buffer = await fs.readFile(filePath);
    
    // 4. Convert to Base64
    const base64Data = buffer.toString("base64");

    logger.debug(`Converted file to Gemini Part`, { 
      filePath, 
      mimeType, 
      size: buffer.length 
    });

    return {
      inlineData: {
        data: base64Data,
        mimeType
      }
    };
  } catch (error) {
    logger.error("Failed to convert file to Gemini Part", { filePath, error });
    throw error;
  }
}
