/**
 * Auth Layout
 *
 * Simple centered layout for authentication pages.
 * No header/footer for a clean auth experience.
 */

import { Logo } from "@/components/Logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="mb-8">
        <Logo size="lg" />
      </div>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
