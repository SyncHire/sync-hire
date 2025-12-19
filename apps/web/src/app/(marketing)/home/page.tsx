import { LandingPage } from "@/components/LandingPage";

/**
 * /home - Always renders the landing page (no auth redirect)
 * Useful for authenticated users who want to view the homepage
 */
export default function HomePage() {
  return <LandingPage />;
}
