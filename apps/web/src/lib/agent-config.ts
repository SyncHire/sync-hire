/**
 * Agent API Configuration
 *
 * Manages the Python agent API URL based on environment:
 * - Development: Direct connection to localhost:8080
 * - Production: Firebase proxy to Cloud Run via /python-api
 */

/**
 * Get the agent API base URL based on environment
 *
 * In production (Firebase Hosting), uses the /python-api proxy route
 * which Firebase Hosting rewrites to the Cloud Run service.
 *
 * In development, connects directly to localhost.
 */
export function getAgentApiUrl(): string {
  // If explicitly set in environment, use that
  if (process.env.AGENT_API_URL) {
    return process.env.AGENT_API_URL;
  }

  // Production: use absolute URL for server-side fetch
  if (process.env.NODE_ENV === 'production') {
    // Server-side needs absolute URL - use Firebase Hosting proxy
    // VERCEL_URL is set by Firebase to the hosting domain
    const host = process.env.VERCEL_URL || 'synchire-hackathon.web.app';
    return `https://${host}/python-api`;
  }

  // Development: direct connection
  return process.env.PYTHON_AGENT_URL || 'http://localhost:8080';
}

/**
 * Build a full agent API endpoint URL
 *
 * @param endpoint - The endpoint path (e.g., '/health', '/join-interview')
 * @returns Full URL to the agent endpoint
 */
export function getAgentEndpoint(endpoint: string): string {
  const baseUrl = getAgentApiUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
}

/**
 * Check if we're using the Firebase proxy
 */
export function isUsingFirebaseProxy(): boolean {
  return process.env.NODE_ENV === 'production' && !process.env.AGENT_API_URL;
}

/**
 * Get headers for Python agent API calls
 * Includes X-API-Key for authentication in production
 */
export function getAgentHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Add API key if configured (required for Python agent auth)
  const apiKey = process.env.API_SECRET_KEY;
  if (apiKey) {
    headers['X-API-Key'] = apiKey;
  }

  return headers;
}
