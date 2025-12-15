import { redirect } from "next/navigation";

/**
 * Root Page
 *
 * Redirects authenticated users to the candidate jobs page by default.
 * Users can switch to HR mode via the context switcher if they have an organization.
 */
export default function Home() {
  redirect("/candidate/jobs");
}
