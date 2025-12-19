/**
 * Custom hook for notifications
 * Uses react-query for data fetching with automatic caching
 */

import { useQuery } from "@tanstack/react-query";
import type { Notification } from "@/lib/storage/storage-interface";

interface NotificationsResponse {
  success: boolean;
  data: Notification[];
}

interface UseNotificationsOptions {
  enabled?: boolean;
}

/**
 * Hook for fetching user notifications
 * Only fetches when enabled (user is authenticated)
 */
export function useNotifications(options?: UseNotificationsOptions) {
  const { enabled = true } = options ?? {};

  return useQuery<NotificationsResponse>({
    queryKey: ["/api/notifications"],
    queryFn: async () => {
      const response = await fetch("/api/notifications");
      if (!response.ok) {
        throw new Error("Failed to fetch notifications");
      }
      return response.json();
    },
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds
    enabled,
  });
}
