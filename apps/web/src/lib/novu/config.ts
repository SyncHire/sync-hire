/**
 * Novu Configuration
 *
 * Configuration for Novu notification service.
 * Supports both US (default) and EU regions via environment variables.
 */

export const novuConfig = {
  appId: process.env.NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER ?? "",
  apiKey: process.env.NOVU_API_KEY ?? "",
  backendUrl: process.env.NEXT_PUBLIC_NOVU_BACKEND_URL,
  socketUrl: process.env.NEXT_PUBLIC_NOVU_SOCKET_URL,
};

export function validateNovuConfig(): void {
  if (!novuConfig.apiKey) {
    throw new Error("NOVU_API_KEY environment variable is required");
  }
  if (!novuConfig.appId) {
    throw new Error(
      "NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER environment variable is required",
    );
  }
}
