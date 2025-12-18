/**
 * Shared styles for email templates
 *
 * These styles are used across all transactional emails
 * to maintain consistent branding.
 */

export const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

export const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "40px 20px",
  marginBottom: "64px",
  borderRadius: "8px",
  maxWidth: "465px",
};

export const h1 = {
  color: "#1f2937",
  fontSize: "24px",
  fontWeight: "600",
  lineHeight: "1.25",
  marginBottom: "24px",
  textAlign: "center" as const,
};

export const text = {
  color: "#374151",
  fontSize: "14px",
  lineHeight: "24px",
  marginBottom: "16px",
};

export const buttonContainer = {
  textAlign: "center" as const,
  marginBottom: "24px",
};

export const button = {
  backgroundColor: "#2563eb",
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  padding: "12px 24px",
  display: "inline-block",
};

export const link = {
  color: "#2563eb",
  fontSize: "12px",
  wordBreak: "break-all" as const,
};

export const footer = {
  color: "#6b7280",
  fontSize: "12px",
  lineHeight: "20px",
  marginTop: "32px",
};

/**
 * Warning style for urgent messages (e.g., password reset expiration)
 * Uses red color to indicate urgency.
 */
export const warningUrgent = {
  color: "#dc2626",
  fontSize: "12px",
  lineHeight: "20px",
  marginTop: "16px",
};

/**
 * Warning style for informational messages (e.g., invitation expiration)
 * Uses amber color for non-urgent notices.
 */
export const warningInfo = {
  color: "#f59e0b",
  fontSize: "12px",
  lineHeight: "20px",
  marginTop: "16px",
  textAlign: "center" as const,
};
