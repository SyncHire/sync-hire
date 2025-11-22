/**
 * Stream Video SDK Configuration
 */

export const streamConfig = {
  apiKey: process.env.NEXT_PUBLIC_STREAM_API_KEY || "",
  apiSecret: process.env.STREAM_API_SECRET || "",
} as const;

if (!streamConfig.apiKey) {
  console.warn("⚠️  NEXT_PUBLIC_STREAM_API_KEY not set");
}

if (!streamConfig.apiSecret && typeof window === "undefined") {
  console.warn("⚠️  STREAM_API_SECRET not set (server-side only)");
}
