/**
 * Standardized API Response Helpers
 *
 * Based on Stripe/Vercel API design patterns:
 * - Error responses use nested `error` object with machine-readable code
 * - Success responses return data directly without wrapper
 * - Consistent structure enables client-side error handling
 *
 * @see https://docs.stripe.com/error-handling
 * @see https://vercel.com/docs/rest-api/errors
 */

import { NextResponse } from "next/server";

/**
 * Machine-readable error codes (like Stripe's decline_code)
 */
export type ErrorCode =
  | "bad_request"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "validation_error"
  | "conflict"
  | "rate_limited"
  | "internal_error";

/**
 * Field-level validation error details
 */
export interface FieldError {
  field: string;
  message: string;
}

/**
 * Standard API error structure (Stripe/Vercel pattern)
 */
export interface ApiError {
  code: ErrorCode;
  message: string;
  details?: FieldError[];
}

/**
 * Create a standardized error response
 *
 * @example
 * // Simple error
 * return errorResponse("not_found", "Job not found", 422);
 *
 * @example
 * // Validation error with field details
 * return errorResponse("validation_error", "Validation failed", 422, [
 *   { field: "email", message: "Invalid email format" },
 *   { field: "title", message: "Title is required" }
 * ]);
 */
export function errorResponse(
  code: ErrorCode,
  message: string,
  status: number,
  details?: FieldError[],
): NextResponse {
  const error: ApiError = { code, message };
  if (details && details.length > 0) {
    error.details = details;
  }
  return NextResponse.json({ error }, { status });
}

/**
 * Common error responses for convenience
 */
export const errors = {
  /** 400 Bad Request */
  badRequest: (message: string, details?: FieldError[]) =>
    errorResponse("bad_request", message, 400, details),

  /** 401 Unauthorized */
  unauthorized: (message = "Authentication required") =>
    errorResponse("unauthorized", message, 401),

  /** 403 Forbidden */
  forbidden: (message = "Access denied") =>
    errorResponse("forbidden", message, 403),

  /** 422 Resource Not Found - use instead of 404 to differentiate from "route not found" */
  notFound: (resource: string) =>
    errorResponse("not_found", `${resource} not found`, 422),

  /** 409 Conflict */
  conflict: (message: string) => errorResponse("conflict", message, 409),

  /** 422 Validation Error - for field-level validation failures */
  validation: (message: string, details: FieldError[]) =>
    errorResponse("validation_error", message, 422, details),

  /** 429 Rate Limited */
  rateLimited: (message = "Too many requests") =>
    errorResponse("rate_limited", message, 429),

  /** 500 Internal Server Error */
  internal: (message = "An unexpected error occurred") =>
    errorResponse("internal_error", message, 500),
};

/**
 * Create a success response with data
 *
 * @example
 * // Return single item
 * return successResponse({ id: "123", name: "Job Title" });
 *
 * @example
 * // Return list with pagination
 * return successResponse({ data: jobs, hasMore: true });
 */
export function successResponse<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

/**
 * Create a 201 Created response
 *
 * @example
 * return createdResponse({ id: "new-id", title: "New Job" }, "/api/jobs/new-id");
 */
export function createdResponse<T>(
  data: T,
  locationPath?: string,
): NextResponse {
  const headers: HeadersInit = {};
  if (locationPath) {
    headers.Location = locationPath;
  }
  return NextResponse.json(data, { status: 201, headers });
}

/**
 * Create a 204 No Content response (for DELETE operations)
 */
export function noContentResponse(): NextResponse {
  return new NextResponse(null, { status: 204 });
}
