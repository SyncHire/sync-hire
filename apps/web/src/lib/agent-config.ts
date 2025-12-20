/**
 * Agent API Configuration
 *
 * Manages the Python agent API URL based on environment:
 * - Development: Direct connection to localhost:8080
 * - Production: Direct connection to Cloud Run service
 */

/**
 * Get the agent API base URL based on environment
 *
 * Uses PYTHON_AGENT_URL environment variable which is set to:
 * - Development: http://localhost:8080
 * - Production: Cloud Run service URL (set in apphosting.yaml)
 */
export function getAgentApiUrl(): string {
  // Use PYTHON_AGENT_URL if set (production or custom dev setup)
  if (process.env.PYTHON_AGENT_URL) {
    return process.env.PYTHON_AGENT_URL;
  }

  // Fallback for local development
  return "http://localhost:8080";
}

/**
 * Build a full agent API endpoint URL
 *
 * @param endpoint - The endpoint path (e.g., '/health', '/join-interview')
 * @returns Full URL to the agent endpoint
 */
export function getAgentEndpoint(endpoint: string): string {
  const baseUrl = getAgentApiUrl();
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
}

/**
 * Get headers for Python agent API calls
 * Includes X-API-Key for authentication in production
 */
export function getAgentHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Add API key if configured (required for Python agent auth)
  const apiKey = process.env.API_SECRET_KEY;
  if (apiKey) {
    headers["X-API-Key"] = apiKey;
  }

  return headers;
}
