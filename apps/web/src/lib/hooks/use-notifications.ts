/**
 * Custom hook for notifications
 * Uses react-query for data fetching with automatic caching
 */

import { useQuery } from "@tanstack/react-query";
import type { Notification } from "@/lib/mock-data";

interface NotificationsResponse {
  success: boolean;
  data: Notification[];
}

/**
 * Hook for fetching user notifications
 */
export function useNotifications() {
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
  });
}
