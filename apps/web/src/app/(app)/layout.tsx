/**
 * App Layout (Route Group)
 *
 * Base layout for authenticated app pages.
 * Individual sections (candidate, hr) apply their own header via AppLayout.
 */

export default function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
