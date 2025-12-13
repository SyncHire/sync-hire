import { z } from "zod";
import dotenv from "dotenv";
import path from "node:path";

// Load .env file
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3001),
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),
  GEMINI_MODEL: z.string().default("gemini-2.5-flash"),
  CONFIDENCE_THRESHOLD: z.coerce.number().min(0).max(1).default(0.75),
  WEBHOOK_TIMEOUT_MS: z.coerce.number().default(30000),
  WEBHOOK_RETRY_ATTEMPTS: z.coerce.number().default(3),
  // Optional LangSmith configuration
  LANGCHAIN_TRACING_V2: z.enum(["true", "false"]).optional(),
  LANGCHAIN_API_KEY: z.string().optional(),
  LANGCHAIN_PROJECT: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:", JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

export const config = parsed.data;
