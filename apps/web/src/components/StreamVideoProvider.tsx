"use client";

import { StreamVideo, StreamVideoClient } from "@stream-io/video-react-sdk";
/**
 * Stream Video Provider Component
 * Wraps the application with Stream Video Client
 */
import { type ReactNode, useEffect, useState } from "react";
import { useStreamToken } from "@/lib/hooks/use-candidate-interview";
import { logger } from "@/lib/logger";
import { streamConfig } from "@/lib/stream-config";

import "@stream-io/video-react-sdk/dist/css/styles.css";

interface StreamVideoProviderProps {
  children: ReactNode;
  userId: string;
  userName: string;
}

export function StreamVideoProvider({
  children,
  userId,
  userName,
}: StreamVideoProviderProps) {
  const [client, setClient] = useState<StreamVideoClient | null>(null);
  const [initError, setInitError] = useState<string | null>(null);

  // Use React Query to fetch token (automatically deduplicates requests)
  const { data: tokenData, isLoading, error } = useStreamToken(userId);

  useEffect(() => {
    const initializeClient = async () => {
      // Reset error state on new initialization attempt
      setInitError(null);

      if (!streamConfig.apiKey) {
        const errorMessage = "Stream API key not configured";
        logger.error(new Error(errorMessage), {
          component: "StreamVideoProvider",
        });
        setInitError(errorMessage);
        return;
      }

      if (!tokenData?.token) {
        return;
      }

      try {
        // Initialize Stream Video Client with the cached token
        const videoClient = new StreamVideoClient({
          apiKey: streamConfig.apiKey,
          user: {
            id: userId,
            name: userName,
          },
          token: tokenData.token,
        });

        setClient(videoClient);
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to initialize video client";
        logger.error(err instanceof Error ? err : new Error(String(err)), {
          component: "StreamVideoProvider",
          userId,
        });
        setInitError(errorMessage);
      }
    };

    initializeClient();

    // Cleanup
    return () => {
      if (client) {
        client.disconnectUser();
        setClient(null);
      }
    };
  }, [userId, userName, tokenData, client]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center">
          {/* Spinner */}
          <div className="mb-4 flex justify-center">
            <div className="h-12 w-12 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin"></div>
          </div>
          <div className="text-lg font-medium text-gray-700">
            Connecting to Stream...
          </div>
        </div>
      </div>
    );
  }

  // Show error if token fetch failed or initialization failed
  const displayError = error?.message ?? initError;
  if (displayError) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-red-50 via-white to-orange-50">
        <div className="max-w-md rounded-lg bg-white p-8 shadow-xl border border-red-100 text-center">
          <div className="mb-6 flex justify-center">
            <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
              <svg
                className="h-8 w-8 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
          </div>
          <h2 className="mb-3 text-xl font-bold text-gray-900">
            Connection Failed
          </h2>
          <p className="text-gray-600">{displayError}</p>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center">
          {/* Spinner */}
          <div className="mb-4 flex justify-center">
            <div className="h-12 w-12 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin"></div>
          </div>
          <div className="text-lg font-medium text-gray-700">
            Initializing video...
          </div>
        </div>
      </div>
    );
  }

  return <StreamVideo client={client}>{children}</StreamVideo>;
}
