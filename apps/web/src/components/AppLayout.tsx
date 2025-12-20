"use client";

/**
 * App Layout Component
 *
 * Layout wrapper for authenticated app pages.
 * Renders the main header and optional container styling for children.
 */

import { type AppView, MainHeader } from "./MainHeader";

interface AppLayoutProps {
  view: AppView;
  children: React.ReactNode;
  /** If true, skip the default container styling for custom layouts */
  fullWidth?: boolean;
}

export function AppLayout({
  view,
  children,
  fullWidth = false,
}: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground transition-colors duration-300">
      <MainHeader view={view} />
      {fullWidth ? (
        children
      ) : (
        <main className="container mx-auto px-4 py-8">{children}</main>
      )}
    </div>
  );
}
