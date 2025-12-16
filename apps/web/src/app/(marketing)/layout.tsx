/**
 * Marketing Layout
 *
 * Minimal layout for public marketing pages (landing page).
 * No header, full-width content.
 */

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground transition-colors duration-300">
      {children}
    </div>
  );
}
