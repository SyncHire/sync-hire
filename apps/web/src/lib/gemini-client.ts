/**
 * Gemini Client Singleton
 *
 * Centralizes GoogleGenAI initialization following Next.js best practices.
 * Uses globalThis pattern to preserve instance across hot reloads in development
 * and across warm starts in serverless production environment.
 *
 * @see https://www.prisma.io/docs/orm/more/help-and-troubleshooting/help-articles/nextjs-prisma-client-dev-practices
 */

import { GoogleGenAI } from "@google/genai";

declare global {
  var geminiClient: GoogleGenAI | undefined;
}

const globalForGemini = globalThis as typeof globalThis & {
  geminiClient: GoogleGenAI | undefined;
};

/**
 * Initialize Gemini client as a singleton
 * Reused across requests in warm serverless containers
 * Persisted across hot reloads in development
 */
export const geminiClient =
  globalForGemini.geminiClient ??
  new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY ?? "",
  });

// Preserve instance in development for hot reload support
if (process.env.NODE_ENV !== "production") {
  globalForGemini.geminiClient = geminiClient;
}
