/**
 * Stream Video SDK Configuration
 */

export const streamConfig = {
  apiKey: process.env.NEXT_PUBLIC_STREAM_API_KEY || "",
  apiSecret: process.env.STREAM_API_SECRET || "",
} as const;

if (!streamConfig.apiKey) {
}

if (!streamConfig.apiSecret && typeof window === "undefined") {
}
