"use client";

import { StreamVideo, StreamVideoClient } from "@stream-io/video-react-sdk";
/**
 * Stream Video Provider Component
 * Wraps the application with Stream Video Client
 */
import { type ReactNode, useEffect, useState } from "react";
import { useStreamToken } from "@/lib/hooks/use-interview";
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

  // Use React Query to fetch token (automatically deduplicates requests)
  const { data: tokenData, isLoading, error } = useStreamToken(userId);

  useEffect(() => {
    const initializeClient = async () => {
      if (!streamConfig.apiKey) {
        console.error("Stream API key not configured");
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
      } catch (error) {
        console.error("Error initializing Stream client:", error);
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
  }, [userId, userName, tokenData]);

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

  if (error) {
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
          <p className="text-gray-600">{error.message}</p>
        </div>
      </div>
    );
  }

  if (!client) {
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
          <p className="text-gray-600">Failed to connect to Stream Video</p>
        </div>
      </div>
    );
  }

  return <StreamVideo client={client}>{children}</StreamVideo>;
}
