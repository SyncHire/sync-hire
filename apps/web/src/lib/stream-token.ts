/**
 * Server-side Stream token generation
 */
import { StreamClient } from "@stream-io/node-sdk";
import { streamConfig } from "./stream-config";

let streamClient: StreamClient | null = null;

export function getStreamClient(): StreamClient {
  if (!streamClient) {
    if (!streamConfig.apiKey || !streamConfig.apiSecret) {
      throw new Error("Stream API credentials not configured");
    }

    streamClient = new StreamClient(
      streamConfig.apiKey,
      streamConfig.apiSecret,
    );
  }

  return streamClient;
}

export function generateStreamToken(userId: string): string {
  const client = getStreamClient();

  // Generate a token that expires in 24 hours
  const expirationTime = Math.floor(Date.now() / 1000) + 24 * 60 * 60;

  return client.generateUserToken({
    user_id: userId,
    exp: expirationTime,
  });
}
