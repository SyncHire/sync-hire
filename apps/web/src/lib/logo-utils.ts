/**
 * Company Logo Utilities
 * Uses logo.dev API for company logos
 */

const LOGO_DEV_PUBLIC_KEY = process.env.NEXT_PUBLIC_LOGO_DEV_KEY || 'pk_FgUgq-__SdOal0JNAYVqJQ';

// Map company names to their domains
const COMPANY_DOMAINS: Record<string, string> = {
  'Stripe': 'stripe.com',
  'Databricks': 'databricks.com',
  'Vercel': 'vercel.com',
  'Cloudflare': 'cloudflare.com',
  'OpenAI': 'openai.com',
  'Spotify': 'spotify.com',
  'Meta': 'meta.com',
  'GitHub': 'github.com',
  'Notion': 'notion.com',
};

/**
 * Get the logo URL for a company
 * @param company - Company name
 * @returns Logo URL or null if company not found
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
