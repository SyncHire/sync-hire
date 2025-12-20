import { z } from "zod";

/**
 * Formats a Zod failure error or standard error into a readable string.
 * Reduces verbose JSON arrays into a concise list of field errors.
 */
export function formatError(error: unknown): string {
  if (error instanceof z.ZodError) {
    const issues = error.errors.map((e) => {
      const path = e.path.join(".");
      return `${path}: ${e.message}`;
    });
    return `Validation Failed: ${issues.join("; ")}`;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return String(error);
}
