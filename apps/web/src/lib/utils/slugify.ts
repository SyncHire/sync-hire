/**
 * Slugify Utility
 *
 * Converts text to URL-safe slug format.
 * Used for generating organization slugs from names.
 */

/**
 * Convert text to a URL-safe slug
 *
 * @example
 * slugify("Acme Corp") // "acme-corp"
 * slugify("My Company Inc.") // "my-company-inc"
 * slugify("   Spaces   ") // "spaces"
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters except spaces and hyphens
    .replace(/[\s_-]+/g, "-") // Replace spaces, underscores, multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}
