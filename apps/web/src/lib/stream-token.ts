/**
 * Server-side Stream token generation
 */
import { StreamClient } from "@stream-io/node-sdk";
import { singleton } from "@/lib/utils/singleton";
import { streamConfig } from "./stream-config";

function createStreamClient(): StreamClient {
  if (!streamConfig.apiKey || !streamConfig.apiSecret) {
    throw new Error("Stream API credentials not configured");
  }

  return new StreamClient(streamConfig.apiKey, streamConfig.apiSecret);
}

/**
 * Get the singleton Stream client instance
 */
export const getStreamClient = singleton(createStreamClient);

export function generateStreamToken(userId: string): string {
  const client = getStreamClient();

  // Generate a token that expires in 24 hours
  const expirationTime = Math.floor(Date.now() / 1000) + 24 * 60 * 60;

  return client.generateUserToken({
    user_id: userId,
    exp: expirationTime,
  });
}
