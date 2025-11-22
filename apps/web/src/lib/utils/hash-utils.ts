/**
 * Hash Utilities
 *
 * Content-based hashing for file deduplication and cache keys.
 */

import { createHash } from "crypto";

/**
 * Generate SHA-256 hash from file buffer
 */
export function generateFileHash(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

/**
 * Generate SHA-256 hash from string
 */
export function generateStringHash(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}
