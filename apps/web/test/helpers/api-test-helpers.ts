/**
 * API Test Helpers
 *
 * Utilities for testing Next.js 16 API routes with proper request/response handling.
 */

import { NextRequest } from "next/server";

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
  searchParams?: Record<string, string>;
}

/**
 * Creates a NextRequest for testing API routes
 */
export function createTestRequest(
  path: string,
  options: RequestOptions = {}
): NextRequest {
  const { method = "GET", body, headers = {}, searchParams = {} } = options;

  const url = new URL(path, "http://localhost:3000");

  // Add search params
  for (const [key, value] of Object.entries(searchParams)) {
    url.searchParams.set(key, value);
  }

  const requestInit: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  if (body && method !== "GET") {
    requestInit.body = JSON.stringify(body);
  }

  // Cast to NextRequest's RequestInit which has stricter types than standard RequestInit
  return new NextRequest(url, requestInit as ConstructorParameters<typeof NextRequest>[1]);
}

/**
 * Parses JSON response from API route handlers
 */
export async function parseJsonResponse<T>(response: Response): Promise<T> {
  const json = await response.json();
  return json as T;
}

/**
 * Creates route params object for dynamic routes
 * Next.js 16 uses Promise<params> pattern
 */
export function createRouteParams<T extends Record<string, string>>(
  params: T
): { params: Promise<T> } {
  return { params: Promise.resolve(params) };
}

/**
 * Standard API response type from @/lib/api-response
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: Array<{ field: string; message: string }>;
}
