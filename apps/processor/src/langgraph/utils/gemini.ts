import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { config } from "../../config.js";
import { logger } from "../../utils/logger.js";

// Singleton client instances for different temperature profiles
let strictClient: ChatGoogleGenerativeAI | null = null;
let creativeClient: ChatGoogleGenerativeAI | null = null;

export function getStrictLLM(): ChatGoogleGenerativeAI {
  if (!strictClient) {
    strictClient = new ChatGoogleGenerativeAI({
      apiKey: config.GEMINI_API_KEY,
      model: config.GEMINI_MODEL,
      temperature: 0,
      maxRetries: 2,
    });
    logger.debug("Strict LLM client initialized", { model: config.GEMINI_MODEL, temperature: 0 });
  }
  return strictClient;
}

export function getCreativeLLM(): ChatGoogleGenerativeAI {
  if (!creativeClient) {
    creativeClient = new ChatGoogleGenerativeAI({
      apiKey: config.GEMINI_API_KEY,
      model: config.GEMINI_MODEL,
      temperature: 0.4,
      maxRetries: 2,
    });
    logger.debug("Creative LLM client initialized", { model: config.GEMINI_MODEL, temperature: 0.4 });
  }
  return creativeClient;
}

export function cleanJSON(text: string): string {
  // Strip markdown code blocks and whitespace
  return text.replace(/```json\s*|\s*```/g, "").trim();
}
