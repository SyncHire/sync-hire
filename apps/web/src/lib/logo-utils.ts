/**
 * Company Logo Utilities
 * Uses logo.dev API for company logos, or organization's saved logo if available
 */

const LOGO_DEV_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_LOGO_DEV_KEY || "pk_FgUgq-__SdOal0JNAYVqJQ";

// Map company names to their domains
const COMPANY_DOMAINS: Record<string, string> = {
  Stripe: "stripe.com",
  Databricks: "databricks.com",
  Vercel: "vercel.com",
  Cloudflare: "cloudflare.com",
  Google: "google.com",
  Spotify: "spotify.com",
  Meta: "meta.com",
  GitHub: "github.com",
  Notion: "notion.com",
};

// Organization type for logo lookup - pick the fields we need
export interface OrganizationForLogo {
  name: string;
  logo?: string | null;
}

/**
 * Get the logo URL for an organization
 * Checks organization's saved logo first, then falls back to logo.dev service
 * @param organization - Organization with name and optional logo
 * @returns Logo URL or null if not available
 */
export function getOrganizationLogoUrl(organization: OrganizationForLogo | null | undefined): string | null {
  if (!organization) {
    return null;
  }

  // Check if organization has a saved logo
  if (organization.logo) {
    return organization.logo;
  }

  // Fall back to logo.dev service based on company name
  return getCompanyLogoUrl(organization.name);
}

/**
 * Get the logo URL for a company by name
 * @param company - Company name
 * @returns Logo URL or null if company not found
 * @deprecated Use getOrganizationLogoUrl instead when organization object is available
 */
export function getCompanyLogoUrl(company: string): string | null {
  const domain = COMPANY_DOMAINS[company];
  if (domain) {
    return `https://img.logo.dev/${domain}?token=${LOGO_DEV_PUBLIC_KEY}`;
  }
  return null;
}

/**
 * Get all supported company names
 */
export function getSupportedCompanies(): string[] {
  return Object.keys(COMPANY_DOMAINS);
}
